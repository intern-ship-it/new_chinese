// js/pages/special-occasions/master.js
// Special Occasions Master Management Module

(function ($, window) {
    'use strict';

    window.SpecialOccasionsMasterPage = {
        currentUser: null,
        permissions: {},
        occasions: [],
        selectedOccasion: null,
        editMode: false,
        modal: null,

        // Page initialization
        init: function (params) {
            this.currentUser = JSON.parse(localStorage.getItem(window.APP_CONFIG.STORAGE.USER) || '{}');
            this.loadCSS();
            this.render();
            this.bindEvents();
            this.loadOccasions();
        },
        // ← ADD THIS ENTIRE CLEANUP FUNCTION HERE
        cleanup: function () {
            // Remove all event listeners
            $(document).off('click', '#btnAddOccasion');
            $(document).off('click', '#btnAddOption');
            $(document).off('click', '.btn-remove-option');
            $(document).off('submit', '#occasionForm');
            $(document).off('click', '.btn-edit');
            $(document).off('click', '.btn-delete');
            $(document).off('click', '.btn-toggle-status');
            $(document).off('change', '#filterStatus');
            $(document).off('change', '#filterLanguage');
            $(document).off('keyup', '#searchInput');
            $(document).off('click', '#btnResetFilters');
            $(document).off('hidden.bs.modal', '#occasionModal');

            // Destroy modal if exists
            if (this.modal) {
                this.modal.dispose();
                this.modal = null;
            }

            // Clear data
            this.occasions = [];
            this.selectedOccasion = null;
            this.permissions = {};
            this.editMode = false;
        },

        // Load CSS dynamically
        loadCSS: function () {
            if (!document.getElementById('special-occasions-master-css')) {
                const link = document.createElement('link');
                link.id = 'special-occasions-master-css';
                link.rel = 'stylesheet';
                link.href = '/css/special-occasions-master.css';
                document.head.appendChild(link);
            }
        },

        // Render page HTML
        render: function () {
            const html = `
                <div class="special-occasions-master-page">
                    <!-- Page Header -->
                    <div class="page-header mb-4">
                        <div class="row align-items-center">
                            <div class="col-md-6">
                                <h1 class="h2">
                                    <i class="bi bi-calendar-event"></i> Special Occasions Master
                                </h1>
                                <nav aria-label="breadcrumb">
                                    <ol class="breadcrumb">
                                        <li class="breadcrumb-item"><a href="#" onclick="TempleRouter.navigate('dashboard'); return false;">Dashboard</a></li>
                                        <li class="breadcrumb-item">Bookings</li>
                                        <li class="breadcrumb-item active">Special Occasions Master</li>
                                    </ol>
                                </nav>
                            </div>
                            <div class="col-md-6 text-md-end">
                                <button class="btn btn-primary" id="btnAddOccasion">
                                    <i class="bi bi-plus-circle"></i> Add New Occasion
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
                                    <input type="text" class="form-control" id="searchInput" placeholder="Search by occasion name...">
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

                    <!-- Occasions List -->
                    <div class="card">
                        <div class="card-header">
                            <h5 class="mb-0">
                                <i class="bi bi-list-ul"></i> Occasions List
                                <span class="badge bg-primary ms-2" id="occasionCount">0</span>
                            </h5>
                        </div>
                        <div class="card-body">
                            <div class="table-responsive">
                                <table class="table table-hover" id="occasionsTable">
                                    <thead>
                                        <tr>
                                            <th width="5%">#</th>
                                            <th width="25%">Occasion Name (English)</th>
                                            <th width="25%">Occasion Name (Chinese)</th>
                                            <th width="15%">Options Count</th>
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

                <!-- Add/Edit Modal -->
                ${this.renderModal()}
            `;

            $('#page-container').html(html);
        },

        // Render Modal
        renderModal: function () {
            return `
                <div class="modal fade" id="occasionModal" tabindex="-1">
                    <div class="modal-dialog modal-lg">
                        <div class="modal-content">
                            <div class="modal-header">
                                <h5 class="modal-title" id="modalTitle">
                                    <i class="bi bi-plus-circle"></i> Add New Occasion
                                </h5>
                                <button type="button" class="btn-close" data-bs-dismiss="modal"></button>
                            </div>
                            <form id="occasionForm">
                                <div class="modal-body">
                                    <!-- Language Settings -->
                                    <!-- HIDDEN: Language fields
                                    <div class="row mb-3">
                                        <div class="col-md-6">
                                            <label class="form-label">Primary Language</label>
                                            <input type="text" class="form-control" id="primaryLang" value="English" readonly>
                                        </div>
                                        <div class="col-md-6">
                                            <label class="form-label">Secondary Language</label>
                                            <select class="form-select" id="secondaryLang">
                                                <option value="">Select Language</option>
                                                <option value="Chinese">Chinese</option>
                                                <option value="Tamil">Tamil</option>
                                                <option value="Hindi">Hindi</option>
                                                <option value="Malay">Malay</option>
                                            </select>
                                        </div>
                                    </div>
-->
                                    <!-- Occasion Names -->
                                    <div class="row mb-3">
                                        <div class="col-md-6">
                                            <label class="form-label required">Occasion Name (English)</label>
                                            <input type="text" class="form-control" id="occasionNamePrimary" required placeholder="e.g., Wesak Day Light Offering">
                                        </div>
                                        <div class="col-md-6">
                                            <label class="form-label">Occasion Name (Secondary)</label>
                                            <input type="text" class="form-control" id="occasionNameSecondary" placeholder="e.g., ????">
                                        </div>
                                    </div>

                                    <!-- Occasion Options -->
                                    <div class="mb-3">
                                        <div class="d-flex justify-content-between align-items-center mb-2">
                                            <label class="form-label mb-0">Occasion Options</label>
                                            <button type="button" class="btn btn-sm btn-success" id="btnAddOption">
                                                <i class="bi bi-plus"></i> Add Option
                                            </button>
                                        </div>
                                        <div id="optionsContainer">
                                            <!-- Options will be added dynamically -->
                                        </div>
                                    </div>

                                    <!-- Status -->
                                    <div class="mb-3">
                                        <label class="form-label">Status</label>
                                        <select class="form-select" id="occasionStatus">
                                            <option value="active">Active</option>
                                            <option value="inactive">Inactive</option>
                                        </select>
                                    </div>
                                </div>
                                <div class="modal-footer">
                                    <button type="button" class="btn btn-secondary" data-bs-dismiss="modal">Cancel</button>
                                    <button type="submit" class="btn btn-primary" id="btnSaveOccasion">
                                        <i class="bi bi-check-circle"></i> Save Occasion
                                    </button>
                                </div>
                            </form>
                        </div>
                    </div>
                </div>
            `;
        },


        // Bind events
        bindEvents: function () {
            const self = this;

            // Add occasion button - USE DELEGATED EVENT
            $(document).on('click', '#btnAddOccasion', function () {
                self.openModal();
            });

            // Add option button
            $(document).on('click', '#btnAddOption', function () {
                self.addOption();
            });

            // Remove option button
            $(document).on('click', '.btn-remove-option', function () {
                $(this).closest('.option-item').remove();
            });

            // Form submission
            $(document).on('submit', '#occasionForm', function (e) {
                e.preventDefault();
                self.saveOccasion();
            });

            // Edit button
            $(document).on('click', '.btn-edit', function () {
                const id = $(this).data('id');
                self.editOccasion(id);
            });

            // Delete button
            $(document).on('click', '.btn-delete', function () {
                const id = $(this).data('id');
                self.deleteOccasion(id);
            });

            // Status toggle
            $(document).on('click', '.btn-toggle-status', function () {
                const id = $(this).data('id');
                const currentStatus = $(this).data('status');
                self.toggleStatus(id, currentStatus);
            });

            // Filters - USE DELEGATED EVENTS
            $(document).on('change', '#filterStatus, #filterLanguage', function () {
                self.loadOccasions();
            });

            $(document).on('keyup', '#searchInput', debounce(function () {
                self.loadOccasions();
            }, 500));

            $(document).on('click', '#btnResetFilters', function () {
                $('#filterStatus').val('');
                $('#filterLanguage').val('');
                $('#searchInput').val('');
                self.loadOccasions();
            });

            // Modal hidden event - cleanup
            $(document).on('hidden.bs.modal', '#occasionModal', function () {
                $('#occasionForm')[0].reset();
                $('#optionsContainer').empty();
                self.editMode = false;
                self.selectedOccasion = null;
            });
        },

        // Load occasions from API
        loadOccasions: function () {
            const self = this;

            const params = {
                status: $('#filterStatus').val(),
                secondary_lang: $('#filterLanguage').val(),
                search: $('#searchInput').val()
            };

            // Add debug logging
            console.log('Loading occasions with params:', params);

            TempleAPI.get('/special-occasions', params)
                .done(function (response) {
                    console.log('API Response:', response); // ← Add this debug line

                    if (response.success) {
                        self.occasions = response.data || []; // ← Add fallback
                        self.renderTable();
                        $('#occasionCount').text(response.count || self.occasions.length);
                    } else {
                        console.error('Response not successful:', response);
                        self.showError('Failed to load occasions');
                    }
                })
                .fail(function (xhr) {
                    console.error('API Error:', xhr); // ← Add this debug line
                    self.showError('Failed to load occasions');
                    $('#occasionsTableBody').html(`
                <tr>
                    <td colspan="6" class="text-center text-danger">
                        <i class="bi bi-exclamation-triangle"></i> Failed to load data
                    </td>
                </tr>
            `);
                });
        },

        // Render table
        renderTable: function () {
            const self = this;
            let html = '';

            if (this.occasions.length === 0) {
                html = `
                    <tr>
                        <td colspan="6" class="text-center text-muted">
                            <i class="bi bi-inbox"></i><br>
                            No occasions found
                        </td>
                    </tr>
                `;
            } else {
                this.occasions.forEach((occasion, index) => {
                    const optionsCount = occasion.occasion_options ? occasion.occasion_options.length : 0;
                    const statusBadge = occasion.status === 'active'
                        ? '<span class="badge bg-success">Active</span>'
                        : '<span class="badge bg-secondary">Inactive</span>';

                    html += `
                        <tr>
                            <td>${index + 1}</td>
                            <td>${occasion.occasion_name_primary}</td>
                            <td>${occasion.occasion_name_secondary || '-'}</td>
                            <td>
                                <span class="badge bg-info">${optionsCount} option(s)</span>
                            </td>
                            <td>${statusBadge}</td>
                            <td>
                                <button class="btn btn-sm btn-primary btn-edit" data-id="${occasion.id}" title="Edit">
                                    <i class="bi bi-pencil"></i>
                                </button>
                                <button class="btn btn-sm btn-${occasion.status === 'active' ? 'warning' : 'success'} btn-toggle-status" 
                                        data-id="${occasion.id}" 
                                        data-status="${occasion.status}"
                                        title="${occasion.status === 'active' ? 'Deactivate' : 'Activate'}">
                                    <i class="bi bi-${occasion.status === 'active' ? 'pause' : 'play'}-fill"></i>
                                </button>
                                <button class="btn btn-sm btn-danger btn-delete" data-id="${occasion.id}" title="Delete">
                                    <i class="bi bi-trash"></i>
                                </button>
                            </td>
                        </tr>
                    `;
                });
            }

            $('#occasionsTableBody').html(html);
        },


        // Open modal
        openModal: function (mode = 'add', data = null) {
            this.editMode = mode === 'edit';
            this.selectedOccasion = data;

            if (this.editMode) {
                $('#modalTitle').html('<i class="bi bi-pencil"></i> Edit Occasion');
                this.populateForm(data);
            } else {
                $('#modalTitle').html('<i class="bi bi-plus-circle"></i> Add New Occasion');
                this.resetForm();
            }

            this.modal = new bootstrap.Modal(document.getElementById('occasionModal'));  // ← Store modal instance
            this.modal.show();
        },

        // Populate form for editing
        populateForm: function (data) {
            $('#primaryLang').val(data.primary_lang || 'English');
            $('#secondaryLang').val(data.secondary_lang || '');
            $('#occasionNamePrimary').val(data.occasion_name_primary);
            $('#occasionNameSecondary').val(data.occasion_name_secondary || '');
            $('#occasionStatus').val(data.status);

            // Clear and populate options
            $('#optionsContainer').empty();
            if (data.occasion_options && data.occasion_options.length > 0) {
                data.occasion_options.forEach(option => {
                    this.addOption(option);
                });
            }
        },

        // Reset form
        resetForm: function () {
            $('#occasionForm')[0].reset();
            $('#optionsContainer').empty();
            this.addOption(); // Add one empty option by default
        },

        // Add option field
        addOption: function (data = null) {
            const optionHtml = `
                <div class="option-item card mb-2">
                    <div class="card-body">
                        <div class="row g-2">
                            <div class="col-md-6">
                                <input type="text" class="form-control option-name" placeholder="Option Name" value="${data ? data.option_name : ''}" required>
                            </div>
                            <div class="col-md-5">
                                <input type="number" class="form-control option-amount" placeholder="Amount (RM)" step="0.01" value="${data ? data.amount : ''}" required>
                            </div>
                            <div class="col-md-1">
                                <button type="button" class="btn btn-danger btn-sm w-100 btn-remove-option">
                                    <i class="bi bi-x"></i>
                                </button>
                            </div>
                        </div>
                    </div>
                </div>
            `;
            $('#optionsContainer').append(optionHtml);
        },

        // Save occasion
        saveOccasion: function () {
            const self = this;

            // Collect form data
            const formData = {
                primary_lang: $('#primaryLang').val(),
                secondary_lang: $('#secondaryLang').val(),
                occasion_name_primary: $('#occasionNamePrimary').val(),
                occasion_name_secondary: $('#occasionNameSecondary').val(),
                status: $('#occasionStatus').val(),
                occasion_options: []
            };

            // Collect options
            $('.option-item').each(function () {
                const optionName = $(this).find('.option-name').val();
                const optionAmount = $(this).find('.option-amount').val();

                if (optionName && optionAmount) {
                    formData.occasion_options.push({
                        option_name: optionName,
                        amount: parseFloat(optionAmount)
                    });
                }
            });

            // Show loading
            $('#btnSaveOccasion').prop('disabled', true).html('<span class="spinner-border spinner-border-sm me-2"></span>Saving...');

            // API call
            const apiMethod = this.editMode ? 'put' : 'post';
            const apiUrl = this.editMode ? `/special-occasions/${this.selectedOccasion.id}` : '/special-occasions';

            TempleAPI[apiMethod](apiUrl, formData)
                .done(function (response) {
                    if (response.success) {
                        TempleCore.showToast(response.message, 'success');
                        bootstrap.Modal.getInstance(document.getElementById('occasionModal')).hide();
                        self.modal.hide();
                        self.loadOccasions(); // ← Make sure this line exists
                    }
                })
                .fail(function (xhr) {
                    const error = xhr.responseJSON?.message || 'Failed to save occasion';
                    self.showError(error);
                })
                .always(function () {
                    $('#btnSaveOccasion').prop('disabled', false).html('<i class="bi bi-check-circle"></i> Save Occasion');
                });
        },

        // Edit occasion
        editOccasion: function (id) {
            const occasion = this.occasions.find(o => o.id === id);
            if (occasion) {
                this.openModal('edit', occasion);
            }
        },

        // Delete occasion
        deleteOccasion: function (id) {
            const self = this;

            Swal.fire({
                title: 'Are you sure?',
                text: 'This action cannot be undone!',
                icon: 'warning',
                showCancelButton: true,
                confirmButtonColor: '#d33',
                cancelButtonColor: '#6c757d',
                confirmButtonText: 'Yes, delete it!',
                cancelButtonText: 'Cancel'
            }).then((result) => {
                if (result.isConfirmed) {
                    TempleAPI.delete(`/special-occasions/${id}`)
                        .done(function (response) {
                            if (response.success) {
                                TempleCore.showToast(response.message, 'success');
                                self.loadOccasions();
                            }
                        })
                        .fail(function (xhr) {
                            self.showError('Failed to delete occasion');
                        });
                }
            });
        },

        // Toggle status
        // Toggle status
        // Toggle status
        toggleStatus: function (id, currentStatus) {
            const self = this;
            const newStatus = currentStatus === 'active' ? 'inactive' : 'active';

            $.ajax({
                url: APP_CONFIG.API.BASE_URL + `/special-occasions/${id}/status`,
                method: 'PATCH',
                headers: {
                    'Authorization': 'Bearer ' + localStorage.getItem(APP_CONFIG.STORAGE.ACCESS_TOKEN),
                    'Content-Type': 'application/json',
                    'X-Temple-ID': TempleAPI.getTempleId()  // ← Changed this line
                },
                data: JSON.stringify({ status: newStatus })
            })
                .done(function (response) {
                    if (response.success) {
                        TempleCore.showToast(response.message, 'success');
                        self.loadOccasions();
                    }
                })
                .fail(function (xhr) {
                    console.error('Status update failed:', xhr);
                    self.showError('Failed to update status');
                });
        },

        // Show error
        showError: function (message) {
            TempleCore.showToast(message, 'error');
        }
    };

    // Debounce helper function
    function debounce(func, wait) {
        let timeout;
        return function executedFunction(...args) {
            const later = () => {
                clearTimeout(timeout);
                func(...args);
            };
            clearTimeout(timeout);
            timeout = setTimeout(later, wait);
        };
    }

})(jQuery, window);