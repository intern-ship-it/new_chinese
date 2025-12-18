// js/pages/special-occasions/master.js
// Special Occasions Master Management Module
// UI Labels: "Temple Event" / "Temple Event Packages" (as per Context.docx)
// SAVE ALL TOGETHER - Event + Packages in one action

(function ($, window) {
    'use strict';

    window.SpecialOccasionsMasterPage = {
        currentUser: null,
        permissions: {},
        occasions: [],
        selectedOccasion: null,
        editMode: false,
        modal: null,
        packageModal: null,

        // Lookup data
        lookups: {
            ledgers: [],
            services: []
        },

        // Temporary packages storage (before saving)
        tempPackages: [],
        editingPackageIndex: null,

        // For date picker
        selectedDates: [],
        datePicker: null,

        // ========================================
        // INITIALIZATION
        // ========================================
        init: function (params) {
            this.currentUser = JSON.parse(localStorage.getItem(window.APP_CONFIG.STORAGE.USER) || '{}');
            this.tempPackages = [];
            this.loadCSS();
            this.render();
            this.bindEvents();
            this.loadLookups();
            this.loadOccasions();
        },

        cleanup: function () {
            $(document).off('.occasionMaster');

            if (this.modal) {
                this.modal.dispose();
                this.modal = null;
            }
            if (this.packageModal) {
                this.packageModal.dispose();
                this.packageModal = null;
            }
            if (this.datePicker) {
                this.datePicker.destroy();
                this.datePicker = null;
            }

            this.occasions = [];
            this.selectedOccasion = null;
            this.lookups = { ledgers: [], services: [] };
            this.editMode = false;
            this.tempPackages = [];
            this.editingPackageIndex = null;
            this.selectedDates = [];
        },

        loadCSS: function () {
            if (!document.getElementById('special-occasions-master-css')) {
                const link = document.createElement('link');
                link.id = 'special-occasions-master-css';
                link.rel = 'stylesheet';
                link.href = '/css/special-occasions-master.css';
                document.head.appendChild(link);
            }
            if (!document.getElementById('flatpickr-css')) {
                const link = document.createElement('link');
                link.id = 'flatpickr-css';
                link.rel = 'stylesheet';
                link.href = 'https://cdn.jsdelivr.net/npm/flatpickr/dist/flatpickr.min.css';
                document.head.appendChild(link);
            }
        },

        // ========================================
        // RENDER MAIN PAGE
        // ========================================
        render: function () {
            const html = `
                <div class="special-occasions-master-page">
                    <!-- Page Header -->
                    <div class="page-header mb-4">
                        <div class="row align-items-center">
                            <div class="col-md-6">
                                <h1 class="h2">
                                    <i class="bi bi-calendar-event"></i> Temple Events Master
                                </h1>
                                <nav aria-label="breadcrumb">
                                    <ol class="breadcrumb">
                                        <li class="breadcrumb-item"><a href="#" onclick="TempleRouter.navigate('dashboard'); return false;">Dashboard</a></li>
                                        <li class="breadcrumb-item">Bookings</li>
                                        <li class="breadcrumb-item active">Temple Events Master</li>
                                    </ol>
                                </nav>
                            </div>
                            <div class="col-md-6 text-md-end">
                                <button class="btn btn-primary" id="btnAddOccasion">
                                    <i class="bi bi-plus-circle"></i> Add New Temple Event
                                </button>
                            </div>
                        </div>
                    </div>

                    <!-- Filters -->
                    <div class="card mb-4">
                        <div class="card-body">
                            <div class="row g-3">
                                <div class="col-md-3">
                                    <label class="form-label">Status</label>
                                    <select class="form-select" id="filterStatus">
                                        <option value="">All Status</option>
                                        <option value="active">Active</option>
                                        <option value="inactive">Inactive</option>
                                    </select>
                                </div>
                                <div class="col-md-3">
                                    <label class="form-label">Secondary Language</label>
                                    <select class="form-select" id="filterLanguage">
                                        <option value="">All Languages</option>
                                        <option value="Chinese">Chinese</option>
                                        <option value="Tamil">Tamil</option>
                                        <option value="Hindi">Hindi</option>
                                        <option value="Malay">Malay</option>
                                    </select>
                                </div>
                                <div class="col-md-4">
                                    <label class="form-label">Search</label>
                                    <input type="text" class="form-control" id="searchInput" placeholder="Search by event name...">
                                </div>
                                <div class="col-md-2">
                                    <label class="form-label">&nbsp;</label>
                                    <button class="btn btn-secondary w-100" id="btnResetFilters">
                                        <i class="bi bi-arrow-counterclockwise"></i> Reset
                                    </button>
                                </div>
                            </div>
                        </div>
                    </div>

                    <!-- Temple Events List -->
                    <div class="card">
                        <div class="card-header">
                            <h5 class="mb-0">
                                <i class="bi bi-list-ul"></i> Temple Events List
                                <span class="badge bg-primary ms-2" id="occasionCount">0</span>
                            </h5>
                        </div>
                        <div class="card-body">
                            <div class="table-responsive">
                                <table class="table table-hover" id="occasionsTable">
                                    <thead>
                                        <tr>
                                            <th width="5%">#</th>
                                            <th width="25%">Event Name (English)</th>
                                            <th width="25%">Event Name (Chinese)</th>
                                            <th width="15%">Packages Count</th>
                                            <th width="10%">Status</th>
                                            <th width="20%">Actions</th>
                                        </tr>
                                    </thead>
                                    <tbody id="occasionsTableBody">
                                        <tr>
                                            <td colspan="6" class="text-center">
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

                <!-- Temple Event Modal -->
                ${this.renderOccasionModal()}

                <!-- Package Sub-Modal -->
                ${this.renderPackageModal()}
            `;

            $('#page-container').html(html);
        },

        // ========================================
        // RENDER TEMPLE EVENT MODAL
        // ========================================
        renderOccasionModal: function () {
            return `
                <div class="modal fade" id="occasionModal" tabindex="-1" data-bs-backdrop="static">
                    <div class="modal-dialog modal-lg">
                        <div class="modal-content border-0 shadow">
                            <div class="modal-header border-bottom">
                                <h5 class="modal-title" id="modalTitle">
                                    <i class="bi bi-plus-circle text-success me-2"></i>Add New Temple Event
                                </h5>
                                <button type="button" class="btn-close" data-bs-dismiss="modal"></button>
                            </div>
                            <div class="modal-body p-4">
                                <form id="occasionForm">
                                    <input type="hidden" id="occasionId">
                                    
                                    <!-- Primary Name -->
                                    <div class="mb-3">
                                        <label class="form-label">Primary Name <span class="text-danger">*</span></label>
                                        <input type="text" class="form-control bg-light" id="occasionNamePrimary" required placeholder="">
                                        <small class="text-muted">Enter event name in English</small>
                                    </div>

                                    <!-- Secondary Name -->
                                    <div class="mb-3">
                                        <label class="form-label">Secondary Name</label>
                                        <input type="text" class="form-control bg-light" id="occasionNameSecondary" placeholder="Optional secondary name">
                                        <small class="text-muted">Optional alternative name (e.g., Chinese)</small>
                                    </div>

                                    <!-- Status -->
                                    <div class="row mb-4">
                                        <div class="col-md-6">
                                            <label class="form-label">Status <span class="text-danger">*</span></label>
                                            <select class="form-select bg-light" id="occasionStatus">
                                                <option value="active">Active</option>
                                                <option value="inactive">Inactive</option>
                                            </select>
                                        </div>
                                    </div>

                                    <hr class="my-4">

                                    <!-- Packages Section -->
                                    <div class="d-flex justify-content-between align-items-center mb-3">
                                        <h6 class="mb-0 fw-semibold">
                                            <i class="bi bi-box-seam me-2"></i>Temple Event Packages
                                            <span class="badge bg-primary rounded-pill ms-2" id="packageCount">0</span>
                                        </h6>
                                        <button type="button" class="btn btn-success btn-sm" id="btnAddPackage">
                                            <i class="bi bi-plus me-1"></i> Add Package
                                        </button>
                                    </div>
                                    
                                    <div id="packagesContainer">
                                        <div class="text-center py-4 bg-light rounded" id="noPackagesAlert">
                                            <i class="bi bi-box-seam fs-1 text-muted d-block mb-2"></i>
                                            <span class="text-muted">No packages added yet. Click "Add Package" to create one.</span>
                                        </div>
                                    </div>
                                </form>
                            </div>
                            <div class="modal-footer border-top">
                                <button type="button" class="btn btn-secondary" data-bs-dismiss="modal">Cancel</button>
                                <button type="button" class="btn btn-success" id="btnSaveOccasion">
                                    <i class="bi bi-check-circle me-1"></i> Save
                                </button>
                            </div>
                        </div>
                    </div>
                </div>
            `;
        },

        // ========================================
        // RENDER PACKAGE MODAL (Sub-modal)
        // ========================================
        renderPackageModal: function () {
            return `
                <div class="modal fade" id="packageModal" tabindex="-1" data-bs-backdrop="static">
                    <div class="modal-dialog modal-xl modal-dialog-scrollable">
                        <div class="modal-content border-0 shadow">
                            <div class="modal-header border-bottom">
                                <h5 class="modal-title" id="packageModalTitle">
                                    <i class="bi bi-plus-circle text-success me-2"></i>Add Package
                                </h5>
                                <button type="button" class="btn-close" data-bs-dismiss="modal"></button>
                            </div>
                            <div class="modal-body p-4">
                                <form id="packageForm">
                                    <input type="hidden" id="packageIndex" value="">

                                    <!-- Package Name -->
                                    <div class="mb-3">
                                        <label class="form-label">Package Name <span class="text-danger">*</span></label>
                                        <input type="text" class="form-control bg-light" id="packageName" required placeholder="">
                                        <small class="text-muted">Enter package name</small>
                                    </div>

                                    <!-- Description -->
                                    <div class="mb-3">
                                        <label class="form-label">Description</label>
                                        <input type="text" class="form-control bg-light" id="packageDescription" placeholder="Optional description">
                                        <small class="text-muted">Brief description of the package</small>
                                    </div>

                                    <!-- Ledger & Amount -->
                                    <div class="row mb-3">
                                        <div class="col-md-6">
                                            <label class="form-label">Ledger <span class="text-danger">*</span></label>
                                            <select class="form-select bg-light" id="packageLedgerId">
                                                <option value="">Select Ledger</option>
                                            </select>
                                            <small class="text-muted">Select accounting ledger</small>
                                        </div>
                                        <div class="col-md-6">
                                            <label class="form-label">Amount (RM) <span class="text-danger">*</span></label>
                                            <input type="number" class="form-control bg-light" id="packageAmount" required min="0" step="0.01" placeholder="0.00">
                                            <small class="text-muted">Package price</small>
                                        </div>
                                    </div>

                                    <!-- Package Mode & Capacity -->
                                    <div class="row mb-3">
                                        <div class="col-md-6">
                                            <label class="form-label">Package Mode <span class="text-danger">*</span></label>
                                            <select class="form-select bg-light" id="packageMode" required>
                                                <option value="">Select Mode</option>
                                                <option value="single">Single (1 booking per slot)</option>
                                                <option value="multiple">Multiple (many bookings per slot)</option>
                                            </select>
                                            <small class="text-muted">Booking type per time slot</small>
                                        </div>
                                        <div class="col-md-3" id="capacityField" style="display: none;">
                                            <label class="form-label">Capacity</label>
                                            <input type="number" class="form-control bg-light" id="packageCapacity" min="1" placeholder="Max">
                                            <small class="text-muted">Max bookings</small>
                                        </div>
                                        <div class="col-md-6">
                                            <label class="form-label">Status <span class="text-danger">*</span></label>
                                            <select class="form-select bg-light" id="packageStatus">
                                                <option value="active">Active</option>
                                                <option value="inactive">Inactive</option>
                                            </select>
                                        </div>
                                    </div>

                                    <!-- Image -->
                                    <div class="row mb-4">
                                        <div class="col-md-8">
                                            <label class="form-label">Package Image</label>
                                            <input type="file" class="form-control bg-light" id="packageImage" accept="image/*">
                                            <small class="text-muted">For counter & online booking display</small>
                                        </div>
                                        <div class="col-md-4">
                                            <div id="imagePreview" class="bg-light border rounded text-center p-3" style="min-height: 80px; display: flex; align-items: center; justify-content: center;">
                                                <span class="text-muted small">No image selected</span>
                                            </div>
                                        </div>
                                    </div>

                                    <hr class="my-4">

                                    <!-- Time Slots Section -->
                                    <div class="mb-4">
                                        <div class="d-flex justify-content-between align-items-center mb-3">
                                            <h6 class="mb-0 fw-semibold">
                                                <i class="bi bi-clock me-2"></i>Time Slots
                                            </h6>
                                            <button type="button" class="btn btn-outline-success btn-sm" id="btnAddTimeSlot">
                                                <i class="bi bi-plus me-1"></i> Add Time Slot
                                            </button>
                                        </div>
                                        <div id="timeSlotsContainer"></div>
                                    </div>

                                    <hr class="my-4">

                                    <!-- Calendar Configuration -->
                                    <div class="mb-3">
                                        <h6 class="mb-3 fw-semibold">
                                            <i class="bi bi-calendar3 me-2"></i>Calendar Configuration
                                        </h6>
                                        <div class="mb-3">
                                            <div class="btn-group" role="group">
                                                <input type="radio" class="btn-check" name="dateType" id="dateTypeMultiple" value="multiple_dates" checked>
                                                <label class="btn btn-outline-secondary" for="dateTypeMultiple">Multiple Dates</label>
                                                <input type="radio" class="btn-check" name="dateType" id="dateTypeRange" value="date_range">
                                                <label class="btn btn-outline-secondary" for="dateTypeRange">Date Range</label>
                                            </div>
                                        </div>
                                        
                                        <div id="multipleDatesSection">
                                            <input type="text" class="form-control bg-light" id="multipleDatesInput" placeholder="Click to select dates">
                                            <small class="text-muted">Select specific dates for this package</small>
                                            <div id="selectedDatesDisplay" class="mt-2"></div>
                                        </div>
                                        
                                        <div id="dateRangeSection" class="d-none">
                                            <div class="row">
                                                <div class="col-md-6">
                                                    <label class="form-label small">Start Date</label>
                                                    <input type="date" class="form-control bg-light" id="dateRangeStart">
                                                </div>
                                                <div class="col-md-6">
                                                    <label class="form-label small">End Date</label>
                                                    <input type="date" class="form-control bg-light" id="dateRangeEnd">
                                                </div>
                                            </div>
                                        </div>
                                    </div>
                                </form>
                            </div>
                            <div class="modal-footer border-top">
                                <button type="button" class="btn btn-secondary" data-bs-dismiss="modal">Cancel</button>
                                <button type="button" class="btn btn-success" id="btnSavePackageToList">
                                    <i class="bi bi-check-circle me-1"></i> Save
                                </button>
                            </div>
                        </div>
                    </div>
                </div>
            `;
        },

        // ========================================
        // EVENT BINDINGS
        // ========================================
        bindEvents: function () {
            const self = this;

            // Add Temple Event
            $(document).on('click.occasionMaster', '#btnAddOccasion', function () {
                self.openOccasionModal('add');
            });

            // Save Temple Event (with all packages)
            $(document).on('click.occasionMaster', '#btnSaveOccasion', function () {
                self.saveOccasionWithPackages();
            });

            // Edit Temple Event
            $(document).on('click.occasionMaster', '.btn-edit', function () {
                const id = $(this).data('id');
                self.editOccasion(id);
            });

            // Delete Temple Event
            $(document).on('click.occasionMaster', '.btn-delete', function () {
                const id = $(this).data('id');
                self.deleteOccasion(id);
            });

            // Toggle Status
            $(document).on('click.occasionMaster', '.btn-toggle-status', function () {
                const id = $(this).data('id');
                const status = $(this).data('status');
                self.toggleStatus(id, status);
            });

            // Add Package (open sub-modal)
            $(document).on('click.occasionMaster', '#btnAddPackage', function () {
                self.openPackageModal('add');
            });

            // Edit Package from list
            $(document).on('click.occasionMaster', '.btn-edit-package', function (e) {
                e.preventDefault();
                const index = $(this).data('index');
                self.openPackageModal('edit', index);
            });

            // Delete Package from list
            $(document).on('click.occasionMaster', '.btn-delete-package', function (e) {
                e.preventDefault();
                const index = $(this).data('index');
                self.removePackageFromList(index);
            });

            // Save Package to temp list
            $(document).on('click.occasionMaster', '#btnSavePackageToList', function () {
                self.savePackageToList();
            });

            // Package Mode change
            $(document).on('change.occasionMaster', '#packageMode', function () {
                if ($(this).val() === 'multiple') {
                    $('#capacityField').show();
                } else {
                    $('#capacityField').hide();
                    $('#packageCapacity').val('');
                }
            });

            // Date type toggle
            $(document).on('change.occasionMaster', 'input[name="dateType"]', function () {
                if ($(this).val() === 'multiple_dates') {
                    $('#multipleDatesSection').removeClass('d-none');
                    $('#dateRangeSection').addClass('d-none');
                } else {
                    $('#multipleDatesSection').addClass('d-none');
                    $('#dateRangeSection').removeClass('d-none');
                }
            });

            // Add/Remove Time Slot
            $(document).on('click.occasionMaster', '#btnAddTimeSlot', function () {
                self.addTimeSlotRow();
            });
            $(document).on('click.occasionMaster', '.btn-remove-slot', function () {
                $(this).closest('.time-slot-row').remove();
            });

            // Image Preview
            $(document).on('change.occasionMaster', '#packageImage', function () {
                self.previewImage(this);
            });

            // Filters
            $(document).on('change.occasionMaster', '#filterStatus, #filterLanguage', function () {
                self.loadOccasions();
            });
            $(document).on('keyup.occasionMaster', '#searchInput', function () {
                clearTimeout(self.searchTimeout);
                self.searchTimeout = setTimeout(() => self.loadOccasions(), 500);
            });
            $(document).on('click.occasionMaster', '#btnResetFilters', function () {
                $('#filterStatus, #filterLanguage').val('');
                $('#searchInput').val('');
                self.loadOccasions();
            });

            // Modal cleanup
            $(document).on('hidden.bs.modal.occasionMaster', '#occasionModal', function () {
                self.resetOccasionForm();
            });
            $(document).on('hidden.bs.modal.occasionMaster', '#packageModal', function () {
                self.resetPackageForm();
            });

            // Init flatpickr when package modal shown
            $(document).on('shown.bs.modal.occasionMaster', '#packageModal', function () {
                self.initFlatpickr();
            });
        },

        // ========================================
        // DATA LOADING
        // ========================================
        loadLookups: function () {
            const self = this;
            TempleAPI.get('/occasion-options/lookups')
                .done(function (response) {
                    if (response.success && response.data) {
                        self.lookups.ledgers = response.data.ledgers || [];
                        self.lookups.services = response.data.services || [];
                    } else if (response.data) {
                        self.lookups.ledgers = response.data.ledgers || [];
                        self.lookups.services = response.data.services || [];
                    } else if (response.ledgers) {
                        self.lookups.ledgers = response.ledgers || [];
                        self.lookups.services = response.services || [];
                    }
                })
                .fail(function (xhr) {
                    console.error('Failed to load lookups:', xhr);
                });
        },

        populateLookupDropdowns: function () {
            const self = this;
            
            // If lookups not loaded yet, load them first
            if (!this.lookups.ledgers || this.lookups.ledgers.length === 0) {
                TempleAPI.get('/occasion-options/lookups')
                    .done(function (response) {
                        if (response.success && response.data) {
                            self.lookups.ledgers = response.data.ledgers || [];
                            self.lookups.services = response.data.services || [];
                        }
                        self.renderLedgerDropdown();
                    });
            } else {
                this.renderLedgerDropdown();
            }
        },
        
        renderLedgerDropdown: function () {
            // Temple Event ledger keywords (from group 4004)
            const templeEventKeywords = ["buddha", "chinese new year", "wesak"];
            
            let ledgerHtml = '<option value="">Select Ledger</option>';
            
            if (this.lookups.ledgers && this.lookups.ledgers.length > 0) {
                this.lookups.ledgers.forEach(l => {
                    const ledgerName = (l.name || l.ledger_name || '').toLowerCase().trim();
                    // Check if ledger name contains any Temple Event keyword
                    const isTempleEvent = templeEventKeywords.some(keyword => ledgerName.includes(keyword));
                    
                    if (isTempleEvent) {
                        const displayName = l.name || l.ledger_name || '';
                        ledgerHtml += `<option value="${l.id}">${displayName}</option>`;
                    }
                });
            }
            
            $('#packageLedgerId').html(ledgerHtml);
        },

        loadOccasions: function () {
            const self = this;
            const params = {
                status: $('#filterStatus').val(),
                secondary_lang: $('#filterLanguage').val(),
                search: $('#searchInput').val()
            };

            // DEBUG: Log API configuration
            console.log('========== DEBUG: loadOccasions ==========');
            console.log('APP_CONFIG:', window.APP_CONFIG);
            console.log('API BASE_URL:', window.APP_CONFIG?.API?.BASE_URL);
            console.log('Temple ID:', TempleAPI.getTempleId ? TempleAPI.getTempleId() : 'N/A');
            console.log('Request params:', params);
            console.log('Full URL:', (window.APP_CONFIG?.API?.BASE_URL || '') + '/special-occasions');
            console.log('==========================================');

            TempleAPI.get('/special-occasions', params)
                .done(function (response) {
                    console.log('========== DEBUG: API Response ==========');
                    console.log('Success:', response.success);
                    console.log('Data count:', response.data?.length || 0);
                    console.log('Full response:', response);
                    console.log('==========================================');
                    
                    if (response.success) {
                        self.occasions = response.data || [];
                        self.renderTable();
                        $('#occasionCount').text(self.occasions.length);
                    }
                })
                .fail(function (xhr) {
                    console.log('========== DEBUG: API Error ==========');
                    console.log('Status:', xhr.status);
                    console.log('Response:', xhr.responseJSON);
                    console.log('==========================================');
                    $('#occasionsTableBody').html('<tr><td colspan="6" class="text-center text-danger">Failed to load data</td></tr>');
                });
        },

        renderTable: function () {
            let html = '';

            if (!this.occasions || this.occasions.length === 0) {
                html = '<tr><td colspan="6" class="text-center text-muted py-4"><i class="bi bi-inbox fs-1 d-block mb-2"></i>No temple events found</td></tr>';
            } else {
                this.occasions.forEach((occ, idx) => {
                    const pkgCount = occ.packages_count || (occ.occasion_options ? occ.occasion_options.length : 0);
                    const statusBadge = occ.status === 'active' 
                        ? '<span class="badge bg-success">Active</span>' 
                        : '<span class="badge bg-secondary">Inactive</span>';

                    html += `
                        <tr>
                            <td>${idx + 1}</td>
                            <td><strong>${occ.occasion_name_primary}</strong></td>
                            <td>${occ.occasion_name_secondary || '-'}</td>
                            <td><span class="badge bg-info">${pkgCount} package(s)</span></td>
                            <td>${statusBadge}</td>
                            <td>
                                <button class="btn btn-sm btn-primary btn-edit" data-id="${occ.id}" title="Edit">
                                    <i class="bi bi-pencil"></i>
                                </button>
                                <button class="btn btn-sm btn-${occ.status === 'active' ? 'warning' : 'success'} btn-toggle-status" 
                                        data-id="${occ.id}" data-status="${occ.status}" title="Toggle Status">
                                    <i class="bi bi-${occ.status === 'active' ? 'pause' : 'play'}-fill"></i>
                                </button>
                                <button class="btn btn-sm btn-danger btn-delete" data-id="${occ.id}" title="Delete">
                                    <i class="bi bi-trash"></i>
                                </button>
                            </td>
                        </tr>
                    `;
                });
            }
            $('#occasionsTableBody').html(html);
        },

        // ========================================
        // OCCASION MODAL
        // ========================================
        openOccasionModal: function (mode, data = null) {
            this.editMode = mode === 'edit';
            this.selectedOccasion = data;
            this.tempPackages = [];

            if (this.editMode && data) {
                $('#modalTitle').html('<i class="bi bi-pencil me-2"></i>Edit Temple Event');
                this.populateOccasionForm(data);
                
                // Load existing packages into temp array
                if (data.packages && data.packages.length > 0) {
                    this.tempPackages = data.packages.map(p => ({
                        id: p.id,
                        name: p.name,
                        description: p.description,
                        ledger_id: p.ledger_id,
                        package_mode: p.package_mode,
                        slot_capacity: p.slot_capacity,
                        amount: p.amount,
                        status: p.status,
                        date_type: p.date_type,
                        date_range_start: p.date_range_start,
                        date_range_end: p.date_range_end,
                        // Handle ALL naming variations from API
                        event_dates: (p.active_event_dates || p.dates || p.event_dates || []).map(d => 
                            typeof d === 'string' ? d.split('T')[0] : (d.event_date ? d.event_date.split('T')[0] : d)
                        ),
                        // Handle ALL naming variations from API
                        time_slots: p.active_time_slots || p.time_slots || p.timeSlots || [],
                        services: p.services || []
                    }));
                }
            } else {
                $('#modalTitle').html('<i class="bi bi-plus-circle me-2"></i>Add New Temple Event');
                this.resetOccasionForm();
            }

            this.renderTempPackagesList();
            this.modal = new bootstrap.Modal(document.getElementById('occasionModal'));
            this.modal.show();
        },

        editOccasion: function (id) {
            const self = this;
            
            // Fetch full occasion with packages
            TempleAPI.get(`/special-occasions/${id}`)
                .done(function (response) {
                    if (response.success && response.data) {
                        // Also load packages
                        TempleAPI.get(`/occasion-options/occasion/${id}`)
                            .done(function (pkgResponse) {
                                const data = response.data;
                                data.packages = pkgResponse.success ? pkgResponse.data : [];
                                self.openOccasionModal('edit', data);
                            })
                            .fail(function () {
                                const data = response.data;
                                data.packages = [];
                                self.openOccasionModal('edit', data);
                            });
                    }
                })
                .fail(function () {
                    TempleCore.showToast('Failed to load event details', 'error');
                });
        },

        populateOccasionForm: function (data) {
            $('#occasionId').val(data.id);
            $('#occasionNamePrimary').val(data.occasion_name_primary);
            $('#occasionNameSecondary').val(data.occasion_name_secondary || '');
            $('#occasionStatus').val(data.status);
        },

        resetOccasionForm: function () {
            $('#occasionForm')[0].reset();
            $('#occasionId').val('');
            this.tempPackages = [];
            this.selectedOccasion = null;
            this.editMode = false;
            this.renderTempPackagesList();
        },

        // ========================================
        // TEMP PACKAGES LIST (in occasion modal)
        // ========================================
        renderTempPackagesList: function () {
            const container = $('#packagesContainer');
            
            if (!this.tempPackages || this.tempPackages.length === 0) {
                container.html(`
                    <div class="text-center py-4 bg-light rounded" id="noPackagesAlert">
                        <i class="bi bi-box-seam fs-1 text-muted d-block mb-2"></i>
                        <span class="text-muted">No packages added yet. Click "Add Package" to create one.</span>
                    </div>
                `);
                $('#packageCount').text('0');
                return;
            }

            let html = '<div class="list-group">';
            this.tempPackages.forEach((pkg, idx) => {
                const slotsCount = pkg.time_slots ? pkg.time_slots.length : 0;
                const datesCount = pkg.event_dates ? pkg.event_dates.length : 0;
                html += `
                    <div class="list-group-item bg-light rounded mb-2">
                        <div class="d-flex justify-content-between align-items-center">
                            <div>
                                <h6 class="mb-1">${pkg.name}</h6>
                                <small class="text-muted">
                                    <span class="me-2"><i class="bi bi-currency-dollar"></i> RM ${parseFloat(pkg.amount || 0).toFixed(2)}</span>
                                    <span class="me-2"><i class="bi bi-clock"></i> ${slotsCount} slot(s)</span>
                                    <span><i class="bi bi-calendar"></i> ${datesCount} date(s)</span>
                                </small>
                            </div>
                            <div class="d-flex align-items-center gap-2">
                                <span class="badge bg-${pkg.status === 'active' ? 'success' : 'secondary'}">${pkg.status}</span>
                                <button type="button" class="btn btn-sm btn-outline-primary btn-edit-package" data-index="${idx}" title="Edit">
                                    <i class="bi bi-pencil"></i>
                                </button>
                                <button type="button" class="btn btn-sm btn-outline-danger btn-delete-package" data-index="${idx}" title="Delete">
                                    <i class="bi bi-trash"></i>
                                </button>
                            </div>
                        </div>
                    </div>
                `;
            });
            html += '</div>';

            container.html(html);
            $('#packageCount').text(this.tempPackages.length);
        },

        removePackageFromList: function (index) {
            this.tempPackages.splice(index, 1);
            this.renderTempPackagesList();
            TempleCore.showToast('Package removed from list', 'info');
        },

        // ========================================
        // PACKAGE MODAL (Sub-modal)
        // ========================================
        openPackageModal: function (mode, index = null) {
            this.editingPackageIndex = index;
            this.selectedDates = [];
            
            // Populate dropdowns
            this.populateLookupDropdowns();

            if (mode === 'edit' && index !== null && this.tempPackages[index]) {
                $('#packageModalTitle').html('<i class="bi bi-pencil me-2"></i>Edit Package');
                $('#btnSavePackageToList').html('<i class="bi bi-check me-1"></i> Update Package');
                this.populatePackageForm(this.tempPackages[index]);
            } else {
                $('#packageModalTitle').html('<i class="bi bi-plus-circle me-2"></i>Add Package');
                $('#btnSavePackageToList').html('<i class="bi bi-check me-1"></i> Add to List');
                this.resetPackageForm();
                this.addTimeSlotRow();
            }

            this.packageModal = new bootstrap.Modal(document.getElementById('packageModal'));
            this.packageModal.show();
        },

        populatePackageForm: function (pkg) {
            $('#packageIndex').val(this.editingPackageIndex);
            $('#packageName').val(pkg.name);
            $('#packageDescription').val(pkg.description || '');
            $('#packageLedgerId').val(pkg.ledger_id || '');
            $('#packageMode').val(pkg.package_mode).trigger('change');
            $('#packageCapacity').val(pkg.slot_capacity || '');
            $('#packageAmount').val(pkg.amount);
            $('#packageStatus').val(pkg.status);

            // Date type
            if (pkg.date_type === 'date_range') {
                $('#dateTypeRange').prop('checked', true).trigger('change');
                $('#dateRangeStart').val(pkg.date_range_start);
                $('#dateRangeEnd').val(pkg.date_range_end);
                this.selectedDates = [];
            } else {
                $('#dateTypeMultiple').prop('checked', true).trigger('change');
                
                // Handle dates from API (pkg.active_event_dates, pkg.dates) or local cache (pkg.event_dates)
                const datesArray = pkg.active_event_dates || pkg.dates || pkg.event_dates || [];
                if (datesArray.length > 0) {
                    this.selectedDates = datesArray.map(d => {
                        if (typeof d === 'string') {
                            return d.split('T')[0]; // Handle ISO date strings
                        } else if (d.event_date) {
                            return d.event_date.split('T')[0]; // Handle object with event_date
                        }
                        return d;
                    });
                } else {
                    this.selectedDates = [];
                }
                
                // Update the display
                this.updateSelectedDatesDisplay();
            }

            // Time slots - handle all naming variations: active_time_slots, time_slots, timeSlots
            const timeSlots = pkg.active_time_slots || pkg.time_slots || pkg.timeSlots || [];
            $('#timeSlotsContainer').empty();
            if (timeSlots.length > 0) {
                timeSlots.forEach(slot => this.addTimeSlotRow(slot));
            } else {
                this.addTimeSlotRow();
            }

            // Services
            $('.service-checkbox').prop('checked', false);
            if (pkg.services && pkg.services.length > 0) {
                pkg.services.forEach(s => {
                    const svcId = typeof s === 'object' ? (s.service_id || s.id) : s;
                    $(`#service_${svcId}`).prop('checked', true);
                });
            }
        },

        resetPackageForm: function () {
            if ($('#packageForm').length) {
                $('#packageForm')[0].reset();
            }
            $('#packageIndex').val('');
            $('#timeSlotsContainer').empty();
            $('#imagePreview').html('<span class="text-muted small">No image</span>');
            $('#capacityField').hide();
            $('#multipleDatesSection').removeClass('d-none');
            $('#dateRangeSection').addClass('d-none');
            $('#dateTypeMultiple').prop('checked', true);
            $('#selectedDatesDisplay').empty();
            $('.service-checkbox').prop('checked', false);
            this.selectedDates = [];
            this.editingPackageIndex = null;
        },

        addTimeSlotRow: function (data = null) {
            const html = `
                <div class="time-slot-row bg-light rounded p-3 mb-2">
                    <div class="row g-3 align-items-end">
                        <div class="col-md-3">
                            <label class="form-label small text-muted">Slot Name</label>
                            <input type="text" class="form-control slot-name" placeholder="e.g., Morning Session" value="${data?.slot_name || ''}">
                        </div>
                        <div class="col-md-3">
                            <label class="form-label small text-muted">Secondary Name</label>
                            <input type="text" class="form-control slot-name-secondary" placeholder="e.g., 早上时段" value="${data?.slot_name_secondary || ''}">
                        </div>
                        <div class="col-md-2">
                            <label class="form-label small text-muted">Start Time</label>
                            <input type="time" class="form-control slot-start" value="${data?.start_time || ''}">
                        </div>
                        <div class="col-md-2">
                            <label class="form-label small text-muted">End Time</label>
                            <input type="time" class="form-control slot-end" value="${data?.end_time || ''}">
                        </div>
                        <div class="col-md-1">
                            <label class="form-label small text-muted">Capacity</label>
                            <input type="number" class="form-control slot-capacity" placeholder="Max" min="1" value="${data?.capacity || ''}">
                        </div>
                        <div class="col-md-1 text-center">
                            <label class="form-label small text-muted">&nbsp;</label>
                            <button type="button" class="btn btn-outline-danger btn-remove-slot d-block w-100">
                                <i class="bi bi-trash"></i>
                            </button>
                        </div>
                    </div>
                </div>
            `;
            $('#timeSlotsContainer').append(html);
        },

        savePackageToList: function () {
            // Validation
            const name = $('#packageName').val().trim();
            const mode = $('#packageMode').val();
            const amount = $('#packageAmount').val();

            if (!name) {
                TempleCore.showToast('Please enter package name', 'error');
                return;
            }
            if (!mode) {
                TempleCore.showToast('Please select package mode', 'error');
                return;
            }
            if (!amount) {
                TempleCore.showToast('Please enter amount', 'error');
                return;
            }

            // Collect time slots
            const timeSlots = [];
            $('.time-slot-row').each(function () {
                const slotName = $(this).find('.slot-name').val().trim();
                const start = $(this).find('.slot-start').val();
                const end = $(this).find('.slot-end').val();
                if (slotName && start && end) {
                    timeSlots.push({
                        slot_name: slotName,
                        slot_name_secondary: $(this).find('.slot-name-secondary').val().trim() || null,
                        start_time: start,
                        end_time: end,
                        capacity: $(this).find('.slot-capacity').val() || null
                    });
                }
            });

            // Collect services
            const services = [];
            $('.service-checkbox:checked').each(function () {
                services.push($(this).val());
            });

            // Build package object
            const pkg = {
                name: name,
                description: $('#packageDescription').val().trim(),
                ledger_id: $('#packageLedgerId').val() || null,
                package_mode: mode,
                slot_capacity: mode === 'multiple' ? ($('#packageCapacity').val() || null) : null,
                amount: parseFloat(amount),
                status: $('#packageStatus').val(),
                date_type: $('input[name="dateType"]:checked').val(),
                date_range_start: null,
                date_range_end: null,
                event_dates: [],
                time_slots: timeSlots,
                services: services
            };

            // Date config
            if (pkg.date_type === 'date_range') {
                pkg.date_range_start = $('#dateRangeStart').val();
                pkg.date_range_end = $('#dateRangeEnd').val();
            } else {
                pkg.event_dates = this.selectedDates;
            }

            // Add or update in temp list
            const editIndex = this.editingPackageIndex;
            if (editIndex !== null && editIndex >= 0) {
                // Keep existing ID if editing
                if (this.tempPackages[editIndex] && this.tempPackages[editIndex].id) {
                    pkg.id = this.tempPackages[editIndex].id;
                }
                this.tempPackages[editIndex] = pkg;
                TempleCore.showToast('Package updated', 'success');
            } else {
                this.tempPackages.push(pkg);
                TempleCore.showToast('Package added to list', 'success');
            }

            this.packageModal.hide();
            this.renderTempPackagesList();
        },

        // ========================================
        // SAVE OCCASION WITH ALL PACKAGES
        // ========================================
        saveOccasionWithPackages: function () {
            const self = this;

            const occasionId = $('#occasionId').val();
            const occasionData = {
                occasion_name_primary: $('#occasionNamePrimary').val().trim(),
                occasion_name_secondary: $('#occasionNameSecondary').val().trim() || null,
                status: $('#occasionStatus').val(),
                packages: this.tempPackages // Include all packages
            };

            if (!occasionData.occasion_name_primary) {
                TempleCore.showToast('Please enter event name', 'error');
                return;
            }

            // Show loading
            $('#btnSaveOccasion').prop('disabled', true).html('<span class="spinner-border spinner-border-sm me-2"></span>Saving...');

            // Use TempleAPI.post or TempleAPI.put
            let apiCall;
            if (occasionId) {
                apiCall = TempleAPI.put(`/special-occasions/${occasionId}`, occasionData);
            } else {
                apiCall = TempleAPI.post('/special-occasions', occasionData);
            }

            apiCall
                .done(function (response) {
                    if (response.success) {
                        TempleCore.showToast(response.message || 'Temple event saved successfully', 'success');
                        self.modal.hide();
                        self.loadOccasions();
                    } else {
                        TempleCore.showToast(response.message || 'Failed to save', 'error');
                    }
                })
                .fail(function (xhr) {
                    const error = xhr.responseJSON?.message || 'Failed to save temple event';
                    TempleCore.showToast(error, 'error');
                })
                .always(function () {
                    $('#btnSaveOccasion').prop('disabled', false).html('<i class="bi bi-check-circle me-1"></i> Save Temple Event');
                });
        },

        deleteOccasion: function (id) {
            const self = this;
            Swal.fire({
                title: 'Delete Temple Event?',
                text: 'This will delete all packages too. Cannot be undone!',
                icon: 'warning',
                showCancelButton: true,
                confirmButtonColor: '#d33',
                confirmButtonText: 'Yes, delete!'
            }).then((result) => {
                if (result.isConfirmed) {
                    TempleAPI.delete(`/special-occasions/${id}`)
                        .done(function (response) {
                            if (response.success) {
                                TempleCore.showToast('Deleted successfully', 'success');
                                self.loadOccasions();
                            }
                        })
                        .fail(function () {
                            TempleCore.showToast('Failed to delete', 'error');
                        });
                }
            });
        },

        toggleStatus: function (id, currentStatus) {
            const self = this;
            const newStatus = currentStatus === 'active' ? 'inactive' : 'active';

            // Use direct AJAX for PATCH request
            $.ajax({
                url: window.APP_CONFIG.API.BASE_URL + `/special-occasions/${id}/status`,
                method: 'PATCH',
                headers: {
                    'Authorization': 'Bearer ' + localStorage.getItem(window.APP_CONFIG.STORAGE.ACCESS_TOKEN),
                    'Content-Type': 'application/json',
                    'X-Temple-ID': TempleAPI.getTempleId ? TempleAPI.getTempleId() : ''
                },
                data: JSON.stringify({ status: newStatus })
            })
                .done(function (response) {
                    if (response.success) {
                        TempleCore.showToast(`Status changed to ${newStatus}`, 'success');
                        self.loadOccasions();
                    }
                })
                .fail(function () {
                    TempleCore.showToast('Failed to update status', 'error');
                });
        },

        // ========================================
        // HELPERS
        // ========================================
        initFlatpickr: function () {
            const self = this;
            if (typeof flatpickr === 'undefined') {
                const script = document.createElement('script');
                script.src = 'https://cdn.jsdelivr.net/npm/flatpickr';
                script.onload = function () { self.setupDatePicker(); };
                document.body.appendChild(script);
            } else {
                this.setupDatePicker();
            }
        },

        setupDatePicker: function () {
            const self = this;
            if (this.datePicker) {
                this.datePicker.destroy();
            }
            this.datePicker = flatpickr('#multipleDatesInput', {
                mode: 'multiple',
                dateFormat: 'Y-m-d',
                minDate: 'today',
                defaultDate: this.selectedDates,
                onChange: function (selectedDates) {
                    self.selectedDates = selectedDates.map(d => d.toISOString().split('T')[0]);
                    self.updateSelectedDatesDisplay();
                }
            });
            this.updateSelectedDatesDisplay();
        },

        updateSelectedDatesDisplay: function () {
            if (!this.selectedDates || this.selectedDates.length === 0) {
                $('#selectedDatesDisplay').html('<small class="text-muted">No dates selected</small>');
                return;
            }
            const badges = this.selectedDates.map(d => `<span class="badge bg-primary me-1 mb-1">${d}</span>`).join('');
            $('#selectedDatesDisplay').html(badges);
        },

        previewImage: function (input) {
            if (input.files && input.files[0]) {
                const reader = new FileReader();
                reader.onload = function (e) {
                    $('#imagePreview').html(`<img src="${e.target.result}" class="img-fluid" style="max-height: 60px;">`);
                };
                reader.readAsDataURL(input.files[0]);
            }
        }
    };

})(jQuery, window);