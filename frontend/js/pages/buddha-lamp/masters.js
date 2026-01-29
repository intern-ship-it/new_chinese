// js/pages/buddha/masters.js
// Buddha Lamp Offering Settings Page - Manual Table Implementation (No DataTables)

(function ($, window) {
    "use strict";

    // Ensure BuddhaLampSharedModule exists
    if (!window.BuddhaLampSharedModule) {
        window.BuddhaLampSharedModule = {
            moduleId: 'buddha-lamp',
            eventNamespace: 'buddha-lamp',
            cssId: 'buddha-lamp-css',
            cssPath: '/css/buddha-lamp.css',
            activePages: new Set(),
            
            loadCSS: function() {
                if (!document.getElementById(this.cssId)) {
                    const link = document.createElement('link');
                    link.id = this.cssId;
                    link.rel = 'stylesheet';
                    link.href = this.cssPath;
                    document.head.appendChild(link);
                    console.log('Buddha Lamp CSS loaded');
                }
            },
            
            registerPage: function(pageId) {
                this.activePages.add(pageId);
                this.loadCSS();
                console.log(`Buddha Lamp page registered: ${pageId} (Total: ${this.activePages.size})`);
            },
            
            unregisterPage: function(pageId) {
                this.activePages.delete(pageId);
                console.log(`Buddha Lamp page unregistered: ${pageId} (Remaining: ${this.activePages.size})`);
                
                if (this.activePages.size === 0) {
                    this.cleanup();
                }
            },
            
            hasActivePages: function() {
                return this.activePages.size > 0;
            },
            
            getActivePages: function() {
                return Array.from(this.activePages);
            },
            
            cleanup: function() {
                const cssLink = document.getElementById(this.cssId);
                if (cssLink) {
                    cssLink.remove();
                    console.log('Buddha Lamp CSS removed');
                }
                
                if (typeof gsap !== 'undefined') {
                    gsap.killTweensOf("*");
                }
                
                $(document).off('.' + this.eventNamespace);
                $(window).off('.' + this.eventNamespace);
                
                this.activePages.clear();
                console.log('Buddha Lamp module cleaned up');
            }
        };
    }

    // Buddha Lamp Masters Page Module
    window.BuddhaLampMastersPage = {
        pageId: 'buddha-lamp-masters',
        eventNamespace: window.BuddhaLampSharedModule.eventNamespace,
        
        // Configuration
        config: {
            apiEndpoint: '/buddha-lamp/masters',
            currentId: null,
            ledgers: [],
            masters: [],        // Store all masters
            filteredMasters: [], // Store filtered results
        },
        
        // Resource tracking for cleanup
        intervals: [],
        timeouts: [],
        animations: [],
        masterModal: null,
        viewModal: null,
        
        /**
         * Simple debounce implementation with timeout tracking
         */
        debounce: function(func, wait) {
            const self = this;
            let timeout;
            return function executedFunction(...args) {
                const later = () => {
                    clearTimeout(timeout);
                    func(...args);
                };
                clearTimeout(timeout);
                timeout = setTimeout(later, wait);
                if (self.timeouts && !self.timeouts.includes(timeout)) {
                    self.timeouts.push(timeout);
                }
            };
        },

        /**
         * Initialize the page
         */
        init: function (params) {
            console.log(`Initializing ${this.pageId}...`);
            
            // Register with shared module
            window.BuddhaLampSharedModule.registerPage(this.pageId);
            
            // Render the HTML first!
            this.render();
            
            // Initialize modals
            this.initModals();
            
            // Then load data and initialize
            this.loadLedgers();
            this.loadMasters();
            this.bindEvents();
            this.initAnimations();
        },

        /**
         * Initialize modal instances
         */
        initModals: function() {
            const masterModalElement = document.getElementById('masterModal');
            const viewModalElement = document.getElementById('viewModal');
            
            if (masterModalElement) {
                this.masterModal = new bootstrap.Modal(masterModalElement, {
                    backdrop: 'static',
                    keyboard: false
                });
            }
            
            if (viewModalElement) {
                this.viewModal = new bootstrap.Modal(viewModalElement);
            }
        },

        /**
         * Render page HTML
         */
        render: function() {
            const html = `
                <div class="buddha-lamp-page buddha-lamp-masters-page">
                    <!-- Page Header -->
                    <div class="buddha-lamp-header">
                        <div class="buddha-lamp-header-bg"></div>
                        <div class="container-fluid">
                            <div class="row align-items-center">
                                <div class="col-md-8">
                                    <div class="buddha-lamp-title-wrapper">
                                        <i class="bi bi-gear-fill buddha-lamp-header-icon"></i>
                                        <div>
                                            <h1 class="buddha-lamp-title">Buddha Lamp Offering Settings</h1>
                                            <p class="buddha-lamp-subtitle">佛前灯主设置 • Manage Buddha Lamp Offering</p>
                                        </div>
                                    </div>
                                </div>
                                <div class="col-md-4 text-md-end">
                                    <button class="btn btn-primary btn-lg" id="btnAddNewMaster">
                                        <i class="bi bi-plus-circle"></i> Add New Offering
                                    </button>
                                </div>
                            </div>
                        </div>
                    </div>

                    <!-- Filters Card -->
                    <div class="card shadow-sm mb-4">
                        <div class="card-body">
                            <div class="row g-3 align-items-end">
                                <div class="col-md-3">
                                    <label class="form-label">Status Filter</label>
                                    <select class="form-select" id="filterStatus">
                                        <option value="">All Status</option>
                                        <option value="1">Active</option>
                                        <option value="0">Inactive</option>
                                    </select>
                                </div>
                                <div class="col-md-6">
                                    <label class="form-label">Search</label>
                                    <input type="text" class="form-control" id="searchInput" placeholder="Search by name, amount...">
                                </div>
                                <div class="col-md-3">
                                    <button class="btn btn-outline-primary w-100" id="btnClearFilters">
                                        <i class="bi bi-x-circle"></i> Clear Filters
                                    </button>
                                </div>
                            </div>
                        </div>
                    </div>

                    <!-- Data Table Card -->
                    <div class="card shadow-sm">
                        <div class="card-body">
                            <div class="table-responsive">
                                <table class="table table-hover" id="buddhaLampMastersTable">
                                    <thead>
                                        <tr>
                                            <th>#</th>
                                            <th>Primary Name</th>
                                            <th>Secondary Name</th>
                                            <th>Ledger</th>
                                            <th>Amount</th>
                                            <th>Details</th>
                                            <th>Status</th>
                                            <th>Actions</th>
                                        </tr>
                                    </thead>
                                    <tbody id="mastersTableBody">
                                        <tr>
                                            <td colspan="8" class="text-center py-4">
                                                <div class="spinner-border text-primary" role="status">
                                                    <span class="visually-hidden">Loading...</span>
                                                </div>
                                            </td>
                                        </tr>
                                    </tbody>
                                </table>
                            </div>
                        </div>
                    </div>
                </div>

                <!-- Add/Edit Modal -->
                <div class="modal fade" id="masterModal" tabindex="-1" aria-labelledby="modalTitle" aria-hidden="true" data-bs-backdrop="static">
                    <div class="modal-dialog modal-lg">
                        <div class="modal-content">
                            <div class="modal-header">
                                <h5 class="modal-title" id="modalTitle">
                                    <i class="bi bi-plus-circle"></i> Add New Buddha Lamp Offering
                                </h5>
                                <button type="button" class="btn-close" data-bs-dismiss="modal" aria-label="Close"></button>
                            </div>
                            <form id="masterForm" novalidate>
                                <div class="modal-body">
                                    <input type="hidden" id="masterId">
                                    <div class="row">
                                        <!-- Primary Name -->
                                        <div class="col-md-12 mb-3">
                                            <label class="form-label required">Primary Name</label>
                                            <input type="text" class="form-control" id="primaryName" required placeholder="Enter primary name">
                                            <div class="invalid-feedback">Please enter primary name</div>
                                        </div>

                                        <!-- Secondary Name -->
                                        <div class="col-md-12 mb-3">
                                            <label class="form-label">Secondary Name</label>
                                            <input type="text" class="form-control" id="secondaryName" placeholder="Optional secondary name (中文)">
                                            <small class="form-text text-muted">Optional alternative name in Chinese</small>
                                        </div>

                                        <!-- Ledger (Select2 dropdown) -->
                                        <div class="col-md-6 mb-3">
                                            <label class="form-label required">Ledger</label>
                                            <select class="form-select" id="ledger" required style="width: 100%">
                                                <option value="">Select Ledger</option>
                                            </select>
                                            <div class="invalid-feedback">Please select a ledger</div>
                                        </div>

                                        <!-- Amount -->
                                        <div class="col-md-6 mb-3">
                                            <label class="form-label required">Amount</label>
                                            <div class="input-group">
                                                <span class="input-group-text">$</span>
                                                <input type="number" class="form-control" id="amount" required 
                                                       min="0" step="0.01" placeholder="0.00">
                                            </div>
                                            <div class="invalid-feedback">Please enter a valid amount</div>
                                        </div>

                                        <!-- Status -->
                                        <div class="col-md-12 mb-3">
                                            <label class="form-label required">Status</label>
                                            <select class="form-select" id="status" required>
                                                <option value="1">Active</option>
                                                <option value="0">Inactive</option>
                                            </select>
                                        </div>

                                        <!-- Details -->
                                        <div class="col-md-12 mb-3">
                                            <label class="form-label">Details</label>
                                            <textarea class="form-control" id="details" rows="3" placeholder="Optional details..."></textarea>
                                        </div>
                                    </div>
                                </div>
                                <div class="modal-footer">
                                    <button type="button" class="btn btn-secondary" data-bs-dismiss="modal">Cancel</button>
                                    <button type="submit" class="btn btn-primary" id="btnSaveMaster">
                                        <i class="bi bi-check-circle"></i> Save
                                    </button>
                                </div>
                            </form>
                        </div>
                    </div>
                </div>

                <!-- View Modal -->
                <div class="modal fade" id="viewModal" tabindex="-1" aria-labelledby="viewModalTitle" aria-hidden="true">
                    <div class="modal-dialog modal-lg">
                        <div class="modal-content">
                            <div class="modal-header">
                                <h5 class="modal-title" id="viewModalTitle">Buddha Lamp Offering Details</h5>
                                <button type="button" class="btn-close" data-bs-dismiss="modal" aria-label="Close"></button>
                            </div>
                            <div class="modal-body" id="viewModalBody">
                                <!-- Content will be loaded dynamically -->
                            </div>
                            <div class="modal-footer">
                                <button type="button" class="btn btn-secondary" data-bs-dismiss="modal">Close</button>
                            </div>
                        </div>
                    </div>
                </div>
            `;
            
            $('#page-container').html(html);
        },

        /**
         * Initialize animations
         */
        initAnimations: function () {
            if (typeof AOS !== 'undefined') {
                AOS.init({
                    duration: 800,
                    easing: 'ease-in-out',
                    once: true,
                    offset: 50
                });
            }

            // Animate stats cards
            if (typeof gsap !== 'undefined') {
                const timeline = gsap.timeline();
                
                timeline.fromTo('.stat-card',
                    { opacity: 0, y: 30 },
                    { 
                        opacity: 1,
                        y: 0,
                        duration: 0.5,
                        stagger: 0.1,
                        ease: 'power2.out',
                        clearProps: 'all'
                    }
                );

                this.animations.push(timeline);
            }
        },

        /**
         * Bind UI events with namespace
         */
        bindEvents: function () {
            const self = this;

            // Clear all previous bindings
            $('#btnAddNewMaster').off('click');
            $('#btnSaveMaster').off('click');
            $('#btnClearFilters').off('click');
            $('#filterStatus, #searchInput').off('change keyup');
            $('#masterModal').off('hidden.bs.modal shown.bs.modal');
            $('#viewModal').off('shown.bs.modal');
            $('#masterForm').off('submit');

            // Add New Master button
            $('#btnAddNewMaster').on('click', function (e) {
                e.preventDefault();
                e.stopImmediatePropagation();
                self.showModal();
            });

            // Form submit
            $('#masterForm').on('submit', function (e) {
                e.preventDefault();
                e.stopImmediatePropagation();
                self.saveMaster();
            });

            // Clear Filters button
            $('#btnClearFilters').on('click', function (e) {
                e.preventDefault();
                self.clearFilters();
            });

            // Filter changes with debounce
            $('#filterStatus, #searchInput').on('change keyup', self.debounce(function () {
                self.filterAndRenderTable();
            }, 300));

            // Modal hidden event - cleanup
            $('#masterModal').on('hidden.bs.modal', function () {
                self.resetForm();
                
                // Destroy Select2 instance
                if ($('#ledger').data('select2')) {
                    $('#ledger').select2('destroy');
                }
            });
        },

        /**
         * Load available ledgers
         */
        loadLedgers: async function () {
            try {
                const response = await TempleAPI.get(`${this.config.apiEndpoint}/ledgers`);
                
                if (response.success) {
                    this.config.ledgers = response.data;
                    console.log('Loaded ledgers:', this.config.ledgers.length);
                }
            } catch (error) {
                console.error('Failed to load ledgers:', error);
                TempleCore.showToast('Failed to load ledgers', 'error');
            }
        },

        /**
         * Initialize Select2 for Ledger dropdown
         */
        initLedgerSelect2: function () {
            const self = this;
            
            // Destroy existing Select2 instance if it exists
            if ($('#ledger').data('select2')) {
                $('#ledger').select2('destroy');
            }
            
            // Clear existing options
            $('#ledger').empty().append('<option value="">Select Ledger</option>');
            
            // Add ledger options
            self.config.ledgers.forEach(function(ledger) {
                $('#ledger').append(
                    $('<option></option>')
                        .val(ledger.id)
                        .text(`${ledger.name}`)
                );
            });
            
            // Initialize Select2
            $('#ledger').select2({
                dropdownParent: $('#masterModal'),
                placeholder: 'Select Ledger',
                allowClear: true,
                width: '100%'
            });
        },

        /**
         * Load all masters from API
         */
        loadMasters: async function () {
            try {
                const response = await TempleAPI.get(`${this.config.apiEndpoint}?per_page=1000`);
                
                if (response.success && response.data) {
                    this.config.masters = response.data;
                    this.config.filteredMasters = response.data;
                    
                    // Update statistics
                    this.updateStatistics();
                    
                    // Render table
                    this.renderTable();
                }
            } catch (error) {
                console.error('Failed to load masters:', error);
                TempleCore.showToast('Failed to load Buddha Lamp Offering', 'error');
                
                // Show error in table
                $('#mastersTableBody').html(`
                    <tr>
                        <td colspan="8" class="text-center py-4 text-danger">
                            <i class="bi bi-exclamation-triangle me-2"></i>
                            Failed to load data. Please refresh the page.
                        </td>
                    </tr>
                `);
            }
        },

        /**
         * Update statistics cards
         */
        updateStatistics: function () {
            const total = this.config.masters.length;
            const active = this.config.masters.filter(m => m.status === 1).length;
            const inactive = total - active;

            this.animateValue('statTotal', 0, total, 1000);
            this.animateValue('statActive', 0, active, 1000);
            this.animateValue('statInactive', 0, inactive, 1000);
        },

        /**
         * Animate number value
         */
        animateValue: function (id, start, end, duration) {
            const element = document.getElementById(id);
            if (!element) return;

            let current = start;
            const range = end - start;
            const increment = end > start ? 1 : -1;
            const stepTime = Math.abs(Math.floor(duration / range));

            const timer = setInterval(() => {
                current += increment;
                element.textContent = current;
                if (current === end) {
                    clearInterval(timer);
                }
            }, stepTime);

            this.intervals.push(timer);
        },

        /**
         * Filter and render table based on current filters
         */
        filterAndRenderTable: function () {
            const statusFilter = $('#filterStatus').val();
            const searchTerm = $('#searchInput').val().toLowerCase();

            // Apply filters
            this.config.filteredMasters = this.config.masters.filter(master => {
                // Status filter
                if (statusFilter !== '' && master.status.toString() !== statusFilter) {
                    return false;
                }

                // Search filter
                if (searchTerm) {
                    const nameMatch = master.name.toLowerCase().includes(searchTerm);
                    const secondaryMatch = master.secondary_name && master.secondary_name.toLowerCase().includes(searchTerm);
                    const ledgerMatch = master.ledger && master.ledger.name.toLowerCase().includes(searchTerm);
                    const detailsMatch = master.details && master.details.toLowerCase().includes(searchTerm);
                    const amountMatch = master.amount && master.amount.toString().includes(searchTerm);
                    
                    if (!nameMatch && !secondaryMatch && !ledgerMatch && !detailsMatch && !amountMatch) {
                        return false;
                    }
                }

                return true;
            });

            this.renderTable();
        },

        /**
         * Render table with current filtered data
         */
        renderTable: function () {
            const tbody = $('#mastersTableBody');
            
            if (this.config.filteredMasters.length === 0) {
                tbody.html(`
                    <tr>
                        <td colspan="8" class="text-center py-4 text-muted">
                            <i class="bi bi-inbox me-2"></i>
                            No Buddha Lamp Offering found
                        </td>
                    </tr>
                `);
                return;
            }

            const rows = this.config.filteredMasters.map((master, index) => {
                const secondaryName = master.secondary_name || '<em class="text-muted">N/A</em>';
                const ledgerName = master.ledger ? master.ledger.name : '<em class="text-muted">Not assigned</em>';
                const amount = `$${parseFloat(master.amount || 0).toFixed(2)}`;
                const details = master.details 
                    ? (master.details.length > 50 ? master.details.substring(0, 50) + '...' : master.details)
                    : '<em class="text-muted">No details</em>';
                const statusBadge = master.status === 1 
                    ? '<span class="badge bg-success">Active</span>' 
                    : '<span class="badge bg-secondary">Inactive</span>';

                return `
                    <tr>
                        <td>${index + 1}</td>
                        <td><strong>${master.name}</strong></td>
                        <td>${secondaryName}</td>
                        <td>${ledgerName}</td>
                        <td><strong class="text-primary">${amount}</strong></td>
                        <td><small class="text-muted">${details}</small></td>
                        <td>${statusBadge}</td>
                        <td>
                            <div class="btn-group btn-group-sm" role="group">
                                <button class="btn btn-info btn-view" data-id="${master.id}" title="View">
                                    <i class="bi bi-eye"></i>
                                </button>
                                <button class="btn btn-warning btn-edit" data-id="${master.id}" title="Edit">
                                    <i class="bi bi-pencil"></i>
                                </button>
                                <button class="btn btn-danger btn-delete" data-id="${master.id}" title="Delete">
                                    <i class="bi bi-trash"></i>
                                </button>
                            </div>
                        </td>
                    </tr>
                `;
            }).join('');

            tbody.html(rows);
            
            // Bind action events
            this.bindTableEvents();
        },

        /**
         * Bind table action events
         */
        bindTableEvents: function () {
            const self = this;

            // Remove all previous bindings first
            $('#mastersTableBody').off('click');

            // Use event delegation for dynamically created buttons
            $('#mastersTableBody').on('click', '.btn-view', function (e) {
                e.preventDefault();
                e.stopImmediatePropagation();
                const id = $(this).data('id');
                self.viewMaster(id);
            });

            $('#mastersTableBody').on('click', '.btn-edit', function (e) {
                e.preventDefault();
                e.stopImmediatePropagation();
                const id = $(this).data('id');
                self.editMaster(id);
            });

            $('#mastersTableBody').on('click', '.btn-delete', function (e) {
                e.preventDefault();
                e.stopImmediatePropagation();
                const id = $(this).data('id');
                self.deleteMaster(id);
            });
        },

        /**
         * Show add/edit modal
         */
        showModal: function (data = null) {
            console.log('showModal called', data);
            
            this.resetForm();

            if (data) {
                // Edit mode
                this.config.currentId = data.id;
                $('#modalTitle').html('<i class="bi bi-pencil me-2"></i>Edit Buddha Lamp Offering');
                $('#masterId').val(data.id);
                $('#primaryName').val(data.name);
                $('#secondaryName').val(data.secondary_name || '');
                $('#amount').val(parseFloat(data.amount || 0).toFixed(2));
                $('#status').val(data.status);
                $('#details').val(data.details || '');
            } else {
                // Add mode
                this.config.currentId = null;
                $('#modalTitle').html('<i class="bi bi-plus-circle me-2"></i>Add New Buddha Lamp Offering');
                $('#status').val(1);
                $('#amount').val('0.00');
            }

            // Show the modal using the stored instance
            if (this.masterModal) {
                this.masterModal.show();
                console.log('Modal shown using instance');
                
                // Initialize Select2 after modal is shown
                const self = this;
                setTimeout(function() {
                    self.initLedgerSelect2();
                    
                    // Set ledger value if editing
                    if (data && data.ledger_id) {
                        $('#ledger').val(data.ledger_id).trigger('change');
                    }
                }, 100);
            } else {
                console.error('Modal instance not found');
            }
        },

        /**
         * Reset form
         */
        resetForm: function () {
            const form = document.getElementById('masterForm');
            if (form) {
                form.reset();
                form.classList.remove('was-validated');
            }
            $('#masterId').val('');
            $('#amount').val('0.00');
            this.config.currentId = null;
        },

        /**
         * Save master (create or update)
         */
        saveMaster: async function () {
            const form = document.getElementById('masterForm');

            // Validate form
            if (!form.checkValidity()) {
                form.classList.add('was-validated');
                
                if (typeof gsap !== 'undefined') {
                    gsap.to('.modal-content', {
                        x: [-10, 10, -10, 10, 0],
                        duration: 0.5
                    });
                }
                return;
            }

            const formData = {
                name: $('#primaryName').val().trim(),
                secondary_name: $('#secondaryName').val().trim() || null,
                ledger_id: parseInt($('#ledger').val()),
                amount: parseFloat($('#amount').val()),
                status: parseInt($('#status').val()),
                details: $('#details').val().trim() || null,
            };

            // Disable button and show loading
            const $btnSave = $('#btnSaveMaster');
            $btnSave.prop('disabled', true).html('<span class="spinner-border spinner-border-sm me-1"></span> Saving...');

            try {
                let response;
                if (this.config.currentId) {
                    response = await TempleAPI.put(`${this.config.apiEndpoint}/${this.config.currentId}`, formData);
                } else {
                    response = await TempleAPI.post(this.config.apiEndpoint, formData);
                }

                if (response.success) {
                    if (typeof gsap !== 'undefined') {
                        gsap.to('.modal-content', {
                            scale: 1.05,
                            duration: 0.2,
                            yoyo: true,
                            repeat: 1,
                            ease: 'power2.inOut'
                        });
                    }

                    TempleCore.showToast(response.message || 'Buddha Lamp Offering saved successfully', 'success');
                    
                    // Hide modal
                    if (this.masterModal) {
                        this.masterModal.hide();
                    }
                    
                    // Reload data
                    this.loadMasters();
                } else {
                    TempleCore.showToast(response.message || 'Failed to save Buddha Lamp Offering', 'error');
                }
            } catch (error) {
                console.error('Save failed:', error);
                
                if (error.response && error.response.errors) {
                    const errors = Object.values(error.response.errors).flat();
                    TempleCore.showToast(errors.join('<br>'), 'error');
                } else {
                    TempleCore.showToast('Failed to save Buddha Lamp Offering', 'error');
                }
            } finally {
                // Always reset button state
                $btnSave.prop('disabled', false).html('<i class="bi bi-check-circle"></i> Save');
            }
        },

        /**
         * View master details
         */
        viewMaster: async function (id) {
            try {
                TempleCore.showLoading('Loading details...');

                const response = await TempleAPI.get(`${this.config.apiEndpoint}/${id}`);

                TempleCore.showLoading(false);

                if (response.success && response.data) {
                    const data = response.data;
                    
                    const html = `
                        <div class="row g-3">
                            <div class="col-md-6">
                                <label class="form-label fw-bold">Primary Name:</label>
                                <p>${data.name}</p>
                            </div>
                            <div class="col-md-6">
                                <label class="form-label fw-bold">Secondary Name:</label>
                                <p>${data.secondary_name || '<em class="text-muted">N/A</em>'}</p>
                            </div>
                            <div class="col-md-4">
                                <label class="form-label fw-bold">Ledger:</label>
                                <p>${data.ledger ? data.ledger.name : '<em class="text-muted">Not assigned</em>'}</p>
                            </div>
                            <div class="col-md-4">
                                <label class="form-label fw-bold">Amount:</label>
                                <p class="text-primary fw-bold fs-5">$${parseFloat(data.amount || 0).toFixed(2)}</p>
                            </div>
                            <div class="col-md-4">
                                <label class="form-label fw-bold">Status:</label>
                                <p>${data.status === 1 ? '<span class="badge bg-success">Active</span>' : '<span class="badge bg-secondary">Inactive</span>'}</p>
                            </div>
                            <div class="col-12">
                                <label class="form-label fw-bold">Details:</label>
                                <p>${data.details || '<em class="text-muted">No details</em>'}</p>
                            </div>
                            <div class="col-md-6">
                                <label class="form-label fw-bold">Created:</label>
                                <p><small class="text-muted">${data.created_at || 'N/A'}</small></p>
                            </div>
                            <div class="col-md-6">
                                <label class="form-label fw-bold">Last Updated:</label>
                                <p><small class="text-muted">${data.updated_at || 'N/A'}</small></p>
                            </div>
                        </div>
                    `;

                    $('#viewModalBody').html(html);
                    
                    // Show modal using stored instance
                    if (this.viewModal) {
                        this.viewModal.show();
                    }
                }
            } catch (error) {
                TempleCore.showLoading(false);
                console.error('View failed:', error);
                TempleCore.showToast('Failed to load details', 'error');
            }
        },

        /**
         * Edit master
         */
        editMaster: async function (id) {
            try {
                TempleCore.showLoading('Loading...');

                const response = await TempleAPI.get(`${this.config.apiEndpoint}/${id}`);

                TempleCore.showLoading(false);

                if (response.success && response.data) {
                    this.showModal(response.data);
                }
            } catch (error) {
                TempleCore.showLoading(false);
                console.error('Load failed:', error);
                TempleCore.showToast('Failed to load Buddha Lamp Offering', 'error');
            }
        },

        /**
         * Delete master
         */
        deleteMaster: function (id) {
            const self = this;

            TempleCore.showConfirm(
                'Delete Buddha Lamp Type',
                'Are you sure you want to delete this Buddha Lamp Offering? This action cannot be undone.',
                'warning',
                async function () {
                    try {
                        TempleCore.showLoading('Deleting...');

                        const response = await TempleAPI.delete(`${self.config.apiEndpoint}/${id}`);

                        TempleCore.showLoading(false);

                        if (response.success) {
                            TempleCore.showToast('Buddha Lamp Offering deleted successfully', 'success');
                            self.loadMasters();
                        } else {
                            TempleCore.showToast(response.message || 'Failed to delete', 'error');
                        }
                    } catch (error) {
                        TempleCore.showLoading(false);
                        console.error('Delete failed:', error);
                        
                        if (error.response && error.response.message) {
                            TempleCore.showToast(error.response.message, 'error');
                        } else {
                            TempleCore.showToast('Failed to delete Buddha Lamp Offering', 'error');
                        }
                    }
                }
            );
        },

        /**
         * Clear all filters
         */
        clearFilters: function () {
            $('#filterStatus').val('');
            $('#searchInput').val('');
            this.filterAndRenderTable();
        },

        /**
         * Page cleanup
         */
        cleanup: function () {
            console.log(`Cleaning up ${this.pageId}...`);
            
            window.BuddhaLampSharedModule.unregisterPage(this.pageId);
            
            // Unbind all events
            $('#btnAddNewMaster').off('click');
            $('#btnSaveMaster').off('click');
            $('#btnClearFilters').off('click');
            $('#filterStatus, #searchInput').off('change keyup');
            $('#masterModal').off('hidden.bs.modal shown.bs.modal');
            $('#viewModal').off('shown.bs.modal');
            $('#mastersTableBody').off('click');
            $('#masterForm').off('submit');
            
            $(document).off('.' + this.eventNamespace);
            $(window).off('.' + this.eventNamespace);
            
            if (this.intervals) {
                this.intervals.forEach(interval => clearInterval(interval));
                this.intervals = [];
            }
            
            if (this.timeouts) {
                this.timeouts.forEach(timeout => clearTimeout(timeout));
                this.timeouts = [];
            }
            
            if (typeof gsap !== 'undefined') {
                gsap.killTweensOf(`.${this.pageId}-page *`);
                
                if (this.animations) {
                    this.animations.forEach(anim => {
                        if (anim && anim.kill) {
                            anim.kill();
                        }
                    });
                    this.animations = [];
                }
            }
            
            // Destroy Select2 instance
            if ($('#ledger').data('select2')) {
                $('#ledger').select2('destroy');
            }
            
            // Dispose modal instances
            if (this.masterModal) {
                this.masterModal.dispose();
                this.masterModal = null;
            }
            
            if (this.viewModal) {
                this.viewModal.dispose();
                this.viewModal = null;
            }
            
            this.config = {
                apiEndpoint: '/buddha-lamp/masters',
                currentId: null,
                ledgers: [],
                masters: [],
                filteredMasters: [],
            };
            
            console.log(`${this.pageId} cleanup completed`);
        }
    };

    window.BuddhaLampMastersPage = window.BuddhaLampMastersPage;

})(jQuery, window);