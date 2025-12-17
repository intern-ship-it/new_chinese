// js/pages/events/index.js
// Events listing page with custom pagination (like Ledgers)

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
    window.EventsPage = {
		pageId: 'events-list',
        events: [],
        filters: {
            search: '',
            from_date: '',
            to_date: '',
            status: ''
        },
        currentPage: 1,
        totalPages: 1,
        perPage: 25,
        searchTimeout: null,

        // Initialize page
        init: function () {
            window.EventsSharedModule.registerPage(this.pageId);
            this.render();
            this.bindEvents();
            this.loadEvents();
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
                <div class="events-list-page">
                    <!-- Header with Gradient -->
                    <div class="events-header">
                        <div class="events-header-bg"></div>
                        <div class="container-fluid">
                            <div class="events-title-wrapper">
                                <div>
                                    <i class="bi bi-calendar-event events-header-icon"></i>
                                </div>
                                <div>
                                    <h1 class="events-title">Event Management</h1>
                                    <p class="events-subtitle">Manage and organize temple events</p>
                                </div>
                            </div>
                        </div>
                    </div>

                    <div class="container-fluid mt-4">
                        <!-- Action Buttons -->
                        <div class="row mb-3">
                            <div class="col-12">
                                <button class="btn btn-primary" id="btnCreateEvent">
                                    <i class="bi bi-plus-circle"></i> Create New Event
                                </button>
                                <button class="btn btn-outline-secondary" id="btnRefreshEvents">
                                    <i class="bi bi-arrow-clockwise"></i> Refresh
                                </button>
                            </div>
                        </div>

                        <!-- Filters Card -->
                        <div class="card filter-card mb-3">
                            <div class="card-body">
                                <h5 class="card-title mb-3">
                                    <i class="bi bi-funnel"></i> Filters
                                </h5>
                                <div class="row g-3">
                                    <div class="col-md-3">
                                        <label class="form-label">Search</label>
                                        <div class="input-group">
                                            <span class="input-group-text"><i class="bi bi-search"></i></span>
                                            <input type="text" class="form-control" id="searchInput" placeholder="Search events...">
                                        </div>
                                    </div>
                                    <div class="col-md-2">
                                        <label class="form-label">From Date</label>
                                        <input type="date" class="form-control" id="filterFromDate">
                                    </div>
                                    <div class="col-md-2">
                                        <label class="form-label">To Date</label>
                                        <input type="date" class="form-control" id="filterToDate">
                                    </div>
                                    <div class="col-md-2">
                                        <label class="form-label">Status</label>
                                        <select class="form-select" id="filterStatus">
                                            <option value="">All Status</option>
                                            <option value="active">Active</option>
                                            <option value="inactive">Inactive</option>
                                            <option value="draft">Draft</option>
                                        </select>
                                    </div>
                                    <div class="col-md-3">
                                        <label class="form-label">&nbsp;</label>
                                        <div class="d-flex gap-2">
                                            <button class="btn btn-primary flex-grow-1" id="btnApplyFilters">
                                                <i class="bi bi-search"></i> Apply
                                            </button>
                                            <button class="btn btn-secondary" id="btnClearFilters">
                                                <i class="bi bi-x-circle"></i> Clear
                                            </button>
                                        </div>
                                    </div>
                                </div>
                            </div>
                        </div>

                        <!-- Events Table Card -->
                        <div class="card events-table-card">
                            <div class="card-body">
                                <div class="table-responsive">
                                    <table id="eventsTable" class="table table-hover">
                                        <thead>
                                            <tr>
                                                <th>ID</th>
                                                <th>Event Name</th>
                                                <th>From Date</th>
                                                <th>To Date</th>
                                                <th>Price</th>
                                                <th>Special Price</th>
                                                <th>Max Bookings</th>
                                                <th>Status</th>
                                                <th width="120">Actions</th>
                                            </tr>
                                        </thead>
                                        <tbody id="eventsTableBody">
                                            <tr>
                                                <td colspan="9" class="text-center py-4">
                                                    <div class="spinner-border text-primary" role="status">
                                                        <span class="visually-hidden">Loading...</span>
                                                    </div>
                                                    <p class="mt-2">Loading events...</p>
                                                </td>
                                            </tr>
                                        </tbody>
                                    </table>
                                </div>
                                
                                <!-- Pagination -->
                                <div class="d-flex justify-content-between align-items-center mt-3">
                                    <div id="paginationInfo">
                                        Showing <span id="showingFrom">0</span> to <span id="showingTo">0</span> of <span id="totalRecords">0</span> entries
                                    </div>
                                    <nav>
                                        <ul class="pagination mb-0" id="pagination">
                                            <!-- Pagination will be rendered here -->
                                        </ul>
                                    </nav>
                                </div>
                            </div>
                        </div>
                    </div>
                </div>
            `;

            $('#page-container').html(html);
        },

        // Bind event handlers
        bindEvents: function () {
            const self = this;

            // Create Event button
            $(document).on('click.' + this.eventNamespace, '#btnCreateEvent', function () {
				self.cleanup();
                TempleRouter.navigate('events/create');
            });

            // Refresh button
            $(document).on('click.' + this.eventNamespace, '#btnRefreshEvents', function () {
                self.loadEvents();
                TempleCore.showToast('Events refreshed', 'success');
            });

            // Search input with debounce
            $('#searchInput').on('input.' + this.eventNamespace, function () {
                clearTimeout(self.searchTimeout);
                self.searchTimeout = setTimeout(function () {
                    self.filters.search = $('#searchInput').val();
                    self.currentPage = 1;
                    self.loadEvents();
                }, 300);
            });

            // Filter changes
            $('#filterFromDate').on('change.' + this.eventNamespace, function () {
                self.filters.from_date = $(this).val();
            });

            $('#filterToDate').on('change.' + this.eventNamespace, function () {
                self.filters.to_date = $(this).val();
            });

            $('#filterStatus').on('change.' + this.eventNamespace, function () {
                self.filters.status = $(this).val();
            });

            // Apply Filters button
            $(document).on('click.eventsPage.' + this.eventNamespace, '#btnApplyFilters', function () {
                self.filters.from_date = $('#filterFromDate').val();
                self.filters.to_date = $('#filterToDate').val();
                self.filters.status = $('#filterStatus').val();
                self.currentPage = 1;
                self.loadEvents();
            });

            // Clear Filters button
            $(document).on('click.eventsPage.' + this.eventNamespace, '#btnClearFilters', function () {
                $('#searchInput').val('');
                $('#filterFromDate').val('');
                $('#filterToDate').val('');
                $('#filterStatus').val('');
                self.filters = {
                    search: '',
                    from_date: '',
                    to_date: '',
                    status: ''
                };
                self.currentPage = 1;
                self.loadEvents();
            });

            // View Event
            $(document).on('click.' + this.eventNamespace, '.btn-view-event', function () {
                const id = $(this).data('id');
				self.cleanup();
                TempleRouter.navigate('events/view', { id: id });
            });

            // Edit Event
            $(document).on('click.' + this.eventNamespace, '.btn-edit-event', function () {
                const id = $(this).data('id');
				self.cleanup();
                TempleRouter.navigate('events/edit', { id: id });
            });

            // Delete Event
            $(document).on('click.' + this.eventNamespace, '.btn-delete-event', function () {
                const id = $(this).data('id');
                self.deleteEvent(id);
            });
        },

        // Load events from API
        loadEvents: function () {
            const self = this;

            const params = {
                page: self.currentPage,
                per_page: self.perPage,
                search: self.filters.search,
                from_date: self.filters.from_date,
                to_date: self.filters.to_date,
                status: self.filters.status
            };

            // Remove empty params
            Object.keys(params).forEach(key => {
                if (params[key] === '' || params[key] === null || params[key] === undefined) {
                    delete params[key];
                }
            });

            // Show loading
            $('#eventsTableBody').html(`
                <tr>
                    <td colspan="9" class="text-center py-4">
                        <div class="spinner-border text-primary" role="status">
                            <span class="visually-hidden">Loading...</span>
                        </div>
                        <p class="mt-2">Loading events...</p>
                    </td>
                </tr>
            `);

            TempleAPI.get('/events', params)
                .done(function (response) {
                    if (response.success) {
                        // Handle both paginated and non-paginated responses
                        if (response.data.data) {
                            // Paginated response
                            self.events = response.data.data;
                            self.currentPage = response.data.current_page;
                            self.totalPages = response.data.last_page;
                            self.renderEventsList();
                            self.renderPagination(response.data);
                        } else if (Array.isArray(response.data)) {
                            // Non-paginated array response
                            self.events = response.data;
                            self.renderEventsList();
                            // Hide pagination for non-paginated data
                            $('#paginationInfo').hide();
                            $('#pagination').hide();
                        } else {
                            self.events = [];
                            self.renderEventsList();
                        }
                        
                        // Animate rows
                        self.animateTableRows();
                    } else {
                        self.showError(response.message || 'Failed to load events');
                    }
                })
                .fail(function (xhr) {
                    console.error('Failed to load events:', xhr);
                    self.showError('Failed to load events. Please try again.');
                });
        },

        // Render events list
        renderEventsList: function () {
            const self = this;

            if (!self.events || self.events.length === 0) {
                $('#eventsTableBody').html(`
                    <tr>
                        <td colspan="9" class="text-center py-4">
                            <i class="bi bi-calendar-x" style="font-size: 48px; color: #dee2e6;"></i>
                            <p class="mt-2 text-muted">No events found</p>
                        </td>
                    </tr>
                `);
                return;
            }

            let html = '';
            self.events.forEach(function (event) {
                // Format event name
                let eventName = `<strong>${event.event_name_primary || event.name || '-'}</strong>`;
                if (event.event_name_secondary) {
                    eventName += `<br><small class="text-muted">${event.event_name_secondary}</small>`;
                }

                // Format dates
                const fromDate = event.from_date ? new Date(event.from_date).toLocaleDateString('en-MY', {
                    year: 'numeric',
                    month: 'short',
                    day: 'numeric'
                }) : '-';

                const toDate = event.to_date ? new Date(event.to_date).toLocaleDateString('en-MY', {
                    year: 'numeric',
                    month: 'short',
                    day: 'numeric'
                }) : '-';

                // Format prices
                const price = event.price ? 'RM ' + parseFloat(event.price).toFixed(2) : '-';
                const specialPrice = event.special_price ? 'RM ' + parseFloat(event.special_price).toFixed(2) : '-';

                // Format max bookings
                let maxBookings = event.max_booking_count || '-';
                if (event.max_booking_per_day) {
                    maxBookings += `<br><small class="text-muted">(${event.max_booking_per_day}/day)</small>`;
                }

                // Format status
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
                const status = event.status || 'draft';
                const statusBadge = `<span class="badge bg-${statusClasses[status] || 'secondary'}">${statusLabels[status] || status}</span>`;

                html += `
                    <tr>
                        <td>${event.id}</td>
                        <td>${eventName}</td>
                        <td>${fromDate}</td>
                        <td>${toDate}</td>
                        <td>${price}</td>
                        <td>${specialPrice}</td>
                        <td>${maxBookings}</td>
                        <td>${statusBadge}</td>
                        <td>
                            <div class="btn-group btn-group-sm">
                                <button class="btn btn-info btn-view-event" 
                                        data-id="${event.id}"
                                        title="View">
                                    <i class="bi bi-eye"></i>
                                </button>
                                <button class="btn btn-warning btn-edit-event" 
                                        data-id="${event.id}"
                                        title="Edit">
                                    <i class="bi bi-pencil"></i>
                                </button>
                                <button class="btn btn-danger btn-delete-event" 
                                        data-id="${event.id}"
                                        title="Delete">
                                    <i class="bi bi-trash"></i>
                                </button>
                            </div>
                        </td>
                    </tr>
                `;
            });

            $('#eventsTableBody').html(html);
        },

        // Render pagination
        renderPagination: function (data) {
            // Show pagination elements
            $('#paginationInfo').show();
            $('#pagination').show();

            // Update info
            $('#showingFrom').text(data.from || 0);
            $('#showingTo').text(data.to || 0);
            $('#totalRecords').text(data.total || 0);

            // Build pagination
            let paginationHtml = '';

            // Previous button
            if (data.current_page > 1) {
                paginationHtml += `
                    <li class="page-item">
                        <a class="page-link" href="#" onclick="EventsPage.goToPage(${data.current_page - 1}); return false;">Previous</a>
                    </li>
                `;
            } else {
                paginationHtml += `
                    <li class="page-item disabled">
                        <span class="page-link">Previous</span>
                    </li>
                `;
            }

            // Page numbers
            for (let i = 1; i <= data.last_page; i++) {
                if (i === data.current_page) {
                    paginationHtml += `<li class="page-item active"><span class="page-link">${i}</span></li>`;
                } else if (i === 1 || i === data.last_page || (i >= data.current_page - 2 && i <= data.current_page + 2)) {
                    paginationHtml += `
                        <li class="page-item">
                            <a class="page-link" href="#" onclick="EventsPage.goToPage(${i}); return false;">${i}</a>
                        </li>
                    `;
                } else if (i === data.current_page - 3 || i === data.current_page + 3) {
                    paginationHtml += `<li class="page-item disabled"><span class="page-link">...</span></li>`;
                }
            }

            // Next button
            if (data.current_page < data.last_page) {
                paginationHtml += `
                    <li class="page-item">
                        <a class="page-link" href="#" onclick="EventsPage.goToPage(${data.current_page + 1}); return false;">Next</a>
                    </li>
                `;
            } else {
                paginationHtml += `
                    <li class="page-item disabled">
                        <span class="page-link">Next</span>
                    </li>
                `;
            }

            $('#pagination').html(paginationHtml);
        },

        // Go to specific page
        goToPage: function (page) {
            this.currentPage = page;
            this.loadEvents();
        },

        // Animate table rows
        animateTableRows: function () {
            if (typeof gsap !== 'undefined') {
                setTimeout(() => {
                    gsap.fromTo('#eventsTable tbody tr',
                        { opacity: 0, x: -20 },
                        {
                            opacity: 1,
                            x: 0,
                            duration: 0.3,
                            stagger: 0.05,
                            ease: 'power2.out'
                        }
                    );
                }, 100);
            }
        },

        // Delete event
        deleteEvent: function (id) {
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
                    TempleCore.showLoading(true);
                    
                    TempleAPI.delete('/events/' + id)
                        .done(function (response) {
                            if (response.success) {
                                TempleCore.showToast('Event deleted successfully', 'success');
                                self.loadEvents();
                            } else {
                                TempleCore.showToast(response.message || 'Failed to delete event', 'danger');
                            }
                        })
                        .fail(function (xhr) {
                            console.error('Delete failed:', xhr);
                            let message = 'Failed to delete event';
                            if (xhr.responseJSON && xhr.responseJSON.message) {
                                message = xhr.responseJSON.message;
                            }
                            TempleCore.showToast(message, 'danger');
                        })
                        .always(function () {
                            TempleCore.showLoading(false);
                        });
                }
            });
        },

        // Show error message
        showError: function (message) {
            $('#eventsTableBody').html(`
                <tr>
                    <td colspan="9" class="text-center py-4">
                        <div class="alert alert-danger mb-0">
                            <i class="bi bi-exclamation-triangle"></i> ${message}
                        </div>
                    </td>
                </tr>
            `);
        },

        // Initialize animations
        initAnimations: function () {
            if (typeof gsap !== 'undefined') {
                // Header animation
                gsap.fromTo('.events-header', 
				// FROM state
					{ 
						y: -50,
						opacity: 0,
					},
					{
						y: 0,
						opacity: 1,
						duration: 0.8,
						ease: 'power3.out'
					}
				);

                // Cards animation
                gsap.fromTo('.filter-card, .events-table-card',
					// FROM state
					{ 
						y: 30, 
						opacity: 0 
					},
					// TO state (guaranteed end state)
					{
						y: 0,
						opacity: 1,
						duration: 0.6,
						stagger: 0.2,
						delay: 0.3,
						ease: 'power2.out'
					}
				);
            }
        },
    };

})(jQuery, window);