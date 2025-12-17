// js/pages/events/view.js
// View event details page

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
    window.EventsViewPage = {
		pageId: 'events-view',
        eventId: null,
        eventData: null,

        // Initialize page
        init: function (params) {
            if (!params || !params.id) {
                TempleCore.showToast('Event ID is required', 'danger');
				this.cleanup();
                TempleRouter.navigate('events');
                return;
            }

            this.eventId = params.id;
            window.EventsSharedModule.registerPage(this.pageId);
            this.render();
            this.loadEventData();
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

        // Load module CSS
        loadCSS: function () {
            if (!$('#events-css').length) {
                $('<link>')
                    .attr({
                        id: 'events-css',
                        rel: 'stylesheet',
                        href: '/css/events.css'
                    })
                    .appendTo('head');
            }
        },

        // Render page HTML
        render: function () {
            const html = `
                <div class="events-view-page">
                    <!-- Header -->
                    <div class="events-header">
                        <div class="events-header-bg"></div>
                        <div class="container-fluid">
                            <div class="events-title-wrapper">
                                <div>
                                    <i class="bi bi-eye events-header-icon"></i>
                                </div>
                                <div>
                                    <h1 class="events-title">Event Details</h1>
                                    <p class="events-subtitle">View event information</p>
                                </div>
                            </div>
                        </div>
                    </div>

                    <div class="container-fluid mt-4">
                        <!-- Loading State -->
                        <div id="loadingState" class="text-center py-5">
                            <div class="spinner-border text-primary" role="status">
                                <span class="visually-hidden">Loading...</span>
                            </div>
                            <p class="mt-2">Loading event data...</p>
                        </div>

                        <!-- Details Container (hidden initially) -->
                        <div id="detailsContainer" style="display: none;">
                            <!-- Action Buttons -->
                            <div class="row mb-3">
                                <div class="col-12">
                                    <button class="btn btn-outline-secondary" id="btnBackToList">
                                        <i class="bi bi-arrow-left"></i> Back to Events
                                    </button>
                                    <button class="btn btn-primary" id="btnEditEvent">
                                        <i class="bi bi-pencil"></i> Edit Event
                                    </button>
                                    <button class="btn btn-danger" id="btnDeleteEvent">
                                        <i class="bi bi-trash"></i> Delete Event
                                    </button>
                                </div>
                            </div>

                            <!-- Details Card -->
                            <div class="card event-details-card">
                                <div class="card-body">
                                    <!-- Event Names Section -->
                                    <div class="section-header-gradient mb-3">
                                        <i class="bi bi-card-heading"></i>
                                        <span>Event Names</span>
                                    </div>
                                    <div class="row mb-4">
                                        <div class="col-md-6">
                                            <div class="detail-item">
                                                <label class="detail-label">Event Name (Primary)</label>
                                                <div class="detail-value" id="eventNamePrimary">-</div>
                                            </div>
                                        </div>
                                        <div class="col-md-6">
                                            <div class="detail-item">
                                                <label class="detail-label">Event Name (Secondary)</label>
                                                <div class="detail-value" id="eventNameSecondary">-</div>
                                            </div>
                                        </div>
                                    </div>

                                    <!-- Date Range Section -->
                                    <div class="section-header-gradient mb-3">
                                        <i class="bi bi-calendar-range"></i>
                                        <span>Date Range</span>
                                    </div>
                                    <div class="row mb-4">
                                        <div class="col-md-6">
                                            <div class="detail-item">
                                                <label class="detail-label">From Date</label>
                                                <div class="detail-value" id="fromDate">-</div>
                                            </div>
                                        </div>
                                        <div class="col-md-6">
                                            <div class="detail-item">
                                                <label class="detail-label">To Date</label>
                                                <div class="detail-value" id="toDate">-</div>
                                            </div>
                                        </div>
                                        <div class="col-md-6 mt-3">
                                            <div class="detail-item">
                                                <label class="detail-label">Duration</label>
                                                <div class="detail-value" id="duration">-</div>
                                            </div>
                                        </div>
                                    </div>

                                    <!-- Descriptions Section -->
                                    <div class="section-header-gradient mb-3">
                                        <i class="bi bi-text-paragraph"></i>
                                        <span>Descriptions</span>
                                    </div>
                                    <div class="row mb-4">
                                        <div class="col-md-6">
                                            <div class="detail-item">
                                                <label class="detail-label">Description (Primary)</label>
                                                <div class="detail-value description-text" id="descriptionPrimary">-</div>
                                            </div>
                                        </div>
                                        <div class="col-md-6">
                                            <div class="detail-item">
                                                <label class="detail-label">Description (Secondary)</label>
                                                <div class="detail-value description-text" id="descriptionSecondary">-</div>
                                            </div>
                                        </div>
                                    </div>

                                    <!-- Pricing Section -->
                                    <div class="section-header-gradient mb-3">
                                        <i class="bi bi-currency-dollar"></i>
                                        <span>Pricing</span>
                                    </div>
                                    <div class="row mb-4">
                                        <div class="col-md-4">
                                            <div class="detail-item">
                                                <label class="detail-label">Regular Price</label>
                                                <div class="detail-value price-value" id="price">-</div>
                                            </div>
                                        </div>
                                        <div class="col-md-4">
                                            <div class="detail-item">
                                                <label class="detail-label">Special Price</label>
                                                <div class="detail-value price-value" id="specialPrice">-</div>
                                            </div>
                                        </div>
                                        <div class="col-md-4">
                                            <div class="detail-item">
                                                <label class="detail-label">Savings</label>
                                                <div class="detail-value savings-value" id="savings">-</div>
                                            </div>
                                        </div>
                                    </div>

                                    <!-- Booking Limits Section -->
                                    <div class="section-header-gradient mb-3">
                                        <i class="bi bi-people"></i>
                                        <span>Booking Limits</span>
                                    </div>
                                    <div class="row mb-4">
                                        <div class="col-md-6">
                                            <div class="detail-item">
                                                <label class="detail-label">Max Booking Count</label>
                                                <div class="detail-value" id="maxBookingCount">-</div>
                                            </div>
                                        </div>
                                        <div class="col-md-6">
                                            <div class="detail-item">
                                                <label class="detail-label">Max Booking Per Day</label>
                                                <div class="detail-value" id="maxBookingPerDay">-</div>
                                            </div>
                                        </div>
                                    </div>

                                    <!-- Status Section -->
                                    <div class="section-header-gradient mb-3">
                                        <i class="bi bi-toggle-on"></i>
                                        <span>Status & Metadata</span>
                                    </div>
                                    <div class="row mb-4">
                                        <div class="col-md-4">
                                            <div class="detail-item">
                                                <label class="detail-label">Status</label>
                                                <div class="detail-value" id="status">-</div>
                                            </div>
                                        </div>
                                        <div class="col-md-4">
                                            <div class="detail-item">
                                                <label class="detail-label">Created At</label>
                                                <div class="detail-value" id="createdAt">-</div>
                                            </div>
                                        </div>
                                        <div class="col-md-4">
                                            <div class="detail-item">
                                                <label class="detail-label">Last Updated</label>
                                                <div class="detail-value" id="updatedAt">-</div>
                                            </div>
                                        </div>
                                    </div>
                                </div>
                            </div>
                        </div>
                    </div>
                </div>
            `;

            $('#page-container').html(html);
        },

        // Load event data
        loadEventData: function () {
            const self = this;

            TempleAPI.get('/events/' + this.eventId)
                .done(function (response) {
                    if (response.success) {
                        self.eventData = response.data;
                        self.populateDetails();
                        self.attachEventHandlers();
                        self.initAnimations();
                    } else {
                        TempleCore.showToast(response.message || 'Failed to load event', 'danger');
						self.cleanup();
                        TempleRouter.navigate('events');
                    }
                })
                .fail(function (xhr) {
                    console.error('Load failed:', xhr);
                    TempleCore.showToast('Failed to load event', 'danger');
					self.cleanup();
                    TempleRouter.navigate('events');
                });
        },

        // Populate details
        populateDetails: function () {
            const data = this.eventData;

            // Event names
            $('#eventNamePrimary').text(data.event_name_primary);
            $('#eventNameSecondary').text(data.event_name_secondary || '-');

            // Dates
            const fromDate = new Date(data.from_date);
            const toDate = new Date(data.to_date);
            
            $('#fromDate').text(fromDate.toLocaleDateString('en-MY', {
                year: 'numeric',
                month: 'long',
                day: 'numeric'
            }));
            
            $('#toDate').text(toDate.toLocaleDateString('en-MY', {
                year: 'numeric',
                month: 'long',
                day: 'numeric'
            }));

            // Calculate duration
            const diffTime = Math.abs(toDate - fromDate);
            const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24)) + 1;
            $('#duration').text(diffDays + ' day' + (diffDays > 1 ? 's' : ''));

            // Descriptions
            $('#descriptionPrimary').text(data.description_primary || '-');
            $('#descriptionSecondary').text(data.description_secondary || '-');

            // Pricing
            $('#price').html('RM ' + parseFloat(data.price).toFixed(2));
            
            if (data.special_price) {
                $('#specialPrice').html('RM ' + parseFloat(data.special_price).toFixed(2));
                const savings = parseFloat(data.price) - parseFloat(data.special_price);
                if (savings > 0) {
                    $('#savings').html('<span class="text-success">RM ' + savings.toFixed(2) + ' OFF</span>');
                } else {
                    $('#savings').text('-');
                }
            } else {
                $('#specialPrice').text('-');
                $('#savings').text('-');
            }

            // Booking limits
            $('#maxBookingCount').text(data.max_booking_count || 'Unlimited');
            $('#maxBookingPerDay').text(data.max_booking_per_day || 'Unlimited');

            // Status
            const statusClasses = {
                active: 'success',
                inactive: 'secondary',
                draft: 'warning'
            };
            const statusLabels = {
                active: 'Active',
                inactive: 'Inactive',
                draft: 'Draft'
            };
            $('#status').html(`<span class="badge bg-${statusClasses[data.status]}">${statusLabels[data.status]}</span>`);

            // Metadata
            if (data.created_at) {
                const createdDate = new Date(data.created_at);
                $('#createdAt').text(createdDate.toLocaleDateString('en-MY', {
                    year: 'numeric',
                    month: 'short',
                    day: 'numeric',
                    hour: '2-digit',
                    minute: '2-digit'
                }));
            }

            if (data.updated_at) {
                const updatedDate = new Date(data.updated_at);
                $('#updatedAt').text(updatedDate.toLocaleDateString('en-MY', {
                    year: 'numeric',
                    month: 'short',
                    day: 'numeric',
                    hour: '2-digit',
                    minute: '2-digit'
                }));
            }

            // Hide loading, show details
            $('#loadingState').hide();
            $('#detailsContainer').show();
        },

        // Attach event handlers
        attachEventHandlers: function () {
            const self = this;

            // Back to list button
            $(document).on('click.' + this.eventNamespace, '#btnBackToList', function () {
				self.cleanup();
                TempleRouter.navigate('events');
            });

            // Edit button
            $(document).on('click.' + this.eventNamespace, '#btnEditEvent', function () {
				self.cleanup();
                TempleRouter.navigate('events/edit', { id: self.eventId });
            });

            // Delete button
            $(document).on('click.' + this.eventNamespace, '#btnDeleteEvent', function () {
                self.deleteEvent();
            });
        },

        // Delete event
        deleteEvent: function () {
            const self = this;

            Swal.fire({
                title: 'Delete Event?',
                text: 'Are you sure you want to delete this event? This action cannot be undone.',
                icon: 'warning',
                showCancelButton: true,
                confirmButtonColor: '#dc3545',
                cancelButtonColor: '#6c757d',
                confirmButtonText: 'Yes, delete it!',
                cancelButtonText: 'Cancel'
            }).then((result) => {
                if (result.isConfirmed) {
                    TempleAPI.delete('/events/' + self.eventId)
                        .done(function (response) {
                            if (response.success) {
                                TempleCore.showToast('Event deleted successfully', 'success');
								self.cleanup();
                                TempleRouter.navigate('events');
                            } else {
                                TempleCore.showToast(response.message || 'Failed to delete event', 'danger');
                            }
                        })
                        .fail(function (xhr) {
                            console.error('Delete failed:', xhr);
                            TempleCore.showToast('Failed to delete event', 'danger');
                        });
                }
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
						duration: 0.8,
						ease: 'power3.out'
					}
				);

				// Details card animation
				gsap.fromTo('.event-details-card', 
					{ 
						y: 30, 
						opacity: 0 
					},
					{
						y: 0,
						opacity: 1,
						duration: 0.6,
						delay: 0.3,
						ease: 'power2.out'
					}
				);

				// Sections animation
				gsap.fromTo('.section-header-gradient', 
					{ 
						y: -30, 
						opacity: 0 
					},
					{
						x: 0,
						opacity: 1,
						duration: 0.4,
						stagger: 0.1,
						delay: 0.5,
						ease: 'power2.out'
					}
				);

				// Detail items animation
				gsap.fromTo('.detail-item', 
					{ 
						y: 10, 
						opacity: 0 
					},
					{
						y: 0,
						opacity: 1,
						duration: 0.3,
						stagger: 0.05,
						delay: 0.7,
						ease: 'power2.out'
					}
				);
			}
        },
    };

})(jQuery, window);