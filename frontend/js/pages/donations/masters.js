// frontend/js/pages/donation/masters.js
// Donation Masters Management Module

if (typeof DonationAPI === 'undefined') {
    $.getScript('/js/services/donation-api.js', function () {
        console.log('DonationAPI loaded successfully');
    });
}

(function ($, window) {
    'use strict';

    window.DonationMastersPage = {
        currentUser: null,
        permissions: {},
        donations: [],
        types: [],
        selectedDonation: null,
        editMode: false,
        currentPage: 1,
        perPage: 20,
        modal: null,

        // Initialize page
        init: function (params) {
            console.log('Initializing Donation Masters Page');
            this.currentUser = JSON.parse(localStorage.getItem(window.APP_CONFIG.STORAGE.USER) || '{}');
            this.loadCSS();
            this.render();
            this.bindEvents();
            this.loadTypes();

            setTimeout(() => {
                this.loadDonations();
            }, 100);
        },

        // Cleanup
        cleanup: function () {
            // Remove event listeners
            $(document).off('click', '#btnAddNew');
            $(document).off('click', '#btnRefresh');
            $(document).off('click', '#btnSearch');
            $(document).off('submit', '#donationForm');
            $(document).off('click', '.btn-edit');
            $(document).off('click', '.btn-delete');
            $(document).off('click', '.page-link');
            $('#filterType, #filterStatus').off('change');
            $('#searchInput').off('keypress');

            // Destroy modal if exists
            if (this.modal) {
                this.modal.dispose();
                this.modal = null;
            }

            // Clear data
            this.donations = [];
            this.types = [];
            this.permissions = {};
        },

        // Load CSS
        loadCSS: function () {
            if (!document.getElementById('donation-masters-css')) {
                const link = document.createElement('link');
                link.id = 'donation-masters-css';
                link.rel = 'stylesheet';
                link.href = '/css/donation-masters.css';
                document.head.appendChild(link);
            }
        },

        // Load existing types
        loadTypes: function () {
            const self = this;
            $.ajax({
                url: `${window.APP_CONFIG.API_BASE_URL}/donation-masters/types`,
                method: 'GET',
                headers: {
                    'Authorization': `Bearer ${localStorage.getItem(window.APP_CONFIG.STORAGE.TOKEN)}`,
                    'X-Temple-ID': window.APP_CONFIG.CURRENT_TEMPLE_ID
                },
                success: function (response) {
                    if (response.success) {
                        self.types = response.data || [];
                    }
                },
                error: function (error) {
                    console.error('Error loading types:', error);
                }
            });
        },

        // Render page HTML
        render: function () {
            const html = `
                <div class="donation-masters-page">
                    <!-- Page Header -->
                    <div class="page-header mb-4">
                        <div class="row align-items-center">
                            <div class="col-md-6">
                                <h1 class="h2">
                                    <i class="bi bi-heart-fill"></i> Donation Masters
                                </h1>
                                <nav aria-label="breadcrumb">
                                    <ol class="breadcrumb">
                                        <li class="breadcrumb-item"><a href="#" onclick="TempleRouter.navigate('dashboard'); return false;">Dashboard</a></li>
                                        <li class="breadcrumb-item">Donation</li>
                                        <li class="breadcrumb-item active">Masters</li>
                                    </ol>
                                </nav>
                            </div>
                            <div class="col-md-6 text-end">
                                <button class="btn btn-outline-secondary me-2" id="btnRefresh">
                                    <i class="bi bi-arrow-clockwise"></i> Refresh
                                </button>
                                <button class="btn btn-primary" id="btnAddNew">
                                    <i class="bi bi-plus-circle"></i> Add New
                                </button>
                            </div>
                        </div>
                    </div>

                    <!-- Filters -->
                    <div class="card mb-4">
                        <div class="card-body">
                            <div class="row g-3">
                                <div class="col-md-3">
                                    <label class="form-label">Type</label>
                                    <select class="form-select" id="filterType">
                                        <option value="">All Types</option>
                                        <option value="maintenance">Maintenance</option>
                                        <option value="meal">Meal</option>
                                        <option value="voucher">Voucher</option>
                                        <option value="general">General</option>
                                    </select>
                                </div>
                                <div class="col-md-3">
                                    <label class="form-label">Status</label>
                                    <select class="form-select" id="filterStatus">
                                        <option value="">All Status</option>
                                        <option value="1">Active</option>
                                        <option value="0">Inactive</option>
                                    </select>
                                </div>
                                <div class="col-md-4">
                                    <label class="form-label">Search</label>
                                    <input type="text" class="form-control" id="searchInput" placeholder="Search by name or type...">
                                </div>
                                <div class="col-md-2">
                                    <label class="form-label">&nbsp;</label>
                                    <button class="btn btn-secondary w-100" id="btnSearch">
                                        <i class="bi bi-search"></i> Search
                                    </button>
                                </div>
                            </div>
                        </div>
                    </div>

                    <!-- Donations Table -->
                    <div class="card">
                        <div class="card-body">
                            <div class="table-responsive">
                                <table class="table table-hover">
                                    <thead>
                                        <tr>
                                            <th width="5%">#</th>
                                            <th width="20%">Primary Name</th>
                                            <th width="20%">Secondary Name</th>
                                            <th width="10%">Type</th>
                                            <th width="20%">Details</th>
                                            <th width="10%">Status</th>
                                            <th width="15%">Actions</th>
                                        </tr>
                                    </thead>
                                    <tbody id="donationsTableBody">
                                        <tr>
                                            <td colspan="7" class="text-center">
                                                <div class="spinner-border text-primary" role="status">
                                                    <span class="visually-hidden">Loading...</span>
                                                </div>
                                            </td>
                                        </tr>
                                    </tbody>
                                </table>
                            </div>
                            
                            <!-- Pagination -->
                            <div class="d-flex justify-content-between align-items-center mt-3">
                                <div id="paginationInfo"></div>
                                <nav>
                                    <ul class="pagination mb-0" id="paginationControls"></ul>
                                </nav>
                            </div>
                        </div>
                    </div>

                    <!-- Add/Edit Modal -->
                    ${this.renderModal()}
                </div>
            `;

            $('#page-container').html(html);
        },

        // Render Modal
        renderModal: function () {
            return `
                <div class="modal fade" id="donationModal" tabindex="-1" data-bs-backdrop="static">
                    <div class="modal-dialog modal-lg">
                        <div class="modal-content">
                            <div class="modal-header">
                                <h5 class="modal-title" id="modalTitle">
                                    <i class="bi bi-plus-circle"></i> Add New Type
                                </h5>
                                <button type="button" class="btn-close" data-bs-dismiss="modal"></button>
                            </div>
                            <form id="donationForm">
                                <div class="modal-body">
                                    <div class="row">
                                        <!-- Primary Name -->
                                        <div class="col-md-12 mb-3">
                                            <label class="form-label required">Primary Name</label>
                                            <input type="text" class="form-control" id="donationName" required>
                                            <div class="invalid-feedback">Please enter primary name</div>
                                        </div>

                                        <!-- Secondary Name -->
                                        <div class="col-md-12 mb-3">
                                            <label class="form-label">Secondary Name</label>
                                            <input type="text" class="form-control" id="donationSecondaryName" placeholder="Optional secondary name">
                                            <small class="form-text text-muted">Optional alternative name</small>
                                        </div>

                                        <!-- Type (dropdown) -->
                                        <div class="col-md-6 mb-3">
                                            <label class="form-label required">Type</label>
                                            <select class="form-select" id="donationType" required>
                                                <option value="">Select Type</option>
                                                <option value="maintenance">Maintenance</option>
                                                <option value="meal">Meal</option>
                                                <option value="voucher">Voucher</option>
                                                <option value="general">General</option>
                                            </select>
                                            <div class="invalid-feedback">Please select donation type</div>
                                        </div>

                                        <!-- Status -->
                                        <div class="col-md-6 mb-3">
                                            <label class="form-label required">Status</label>
                                            <select class="form-select" id="donationStatus" required>
                                                <option value="1">Active</option>
                                                <option value="0">Inactive</option>
                                            </select>
                                        </div>

                                        <!-- Details -->
                                        <div class="col-md-12 mb-3">
                                            <label class="form-label">Details</label>
                                            <textarea class="form-control" id="donationDetails" rows="3" placeholder="Optional details..."></textarea>
                                        </div>
                                    </div>
                                </div>
                                <div class="modal-footer">
                                    <button type="button" class="btn btn-secondary" data-bs-dismiss="modal">Cancel</button>
                                    <button type="submit" class="btn btn-primary" id="btnSave">
                                        <i class="bi bi-check-circle"></i> Save
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

            // Add new button
            $(document).on('click', '#btnAddNew', function () {
                self.showAddModal();
            });

            // Refresh button
            $(document).on('click', '#btnRefresh', function () {
                self.loadTypes();
                self.loadDonations();
            });

            // Search button
            $(document).on('click', '#btnSearch', function () {
                self.currentPage = 1;
                self.loadDonations();
            });

            // Form submit
            $(document).on('submit', '#donationForm', function (e) {
                e.preventDefault();
                self.saveDonation();
            });

            // Edit button
            $(document).on('click', '.btn-edit', function () {
                const id = $(this).data('id');
                self.showEditModal(id);
            });

            // Delete button
            $(document).on('click', '.btn-delete', function () {
                const id = $(this).data('id');
                self.deleteDonation(id);
            });

            // Pagination
            $(document).on('click', '.page-link', function (e) {
                e.preventDefault();
                const page = $(this).data('page');
                if (page) {
                    self.currentPage = page;
                    self.loadDonations();
                }
            });

            // Filter change
            $('#filterType, #filterStatus').on('change', function () {
                self.currentPage = 1;
                self.loadDonations();
            });

            // Search on Enter
            $('#searchInput').on('keypress', function (e) {
                if (e.which === 13) {
                    e.preventDefault();
                    self.currentPage = 1;
                    self.loadDonations();
                }
            });

            // Modal hidden event - cleanup
            $(document).on('hidden.bs.modal', '#donationModal', function () {
                $('#donationForm')[0].reset();
                $('#donationForm').removeClass('was-validated');
                self.editMode = false;
                self.selectedDonation = null;
            });
        },

        // Load donations
        loadDonations: function () {
            const self = this;
            const tbody = $('#donationsTableBody');

            if (typeof DonationAPI === 'undefined') {
                console.error('DonationAPI is not loaded yet');
                tbody.html(`
                    <tr>
                        <td colspan="7" class="text-center text-warning">
                            <i class="bi bi-exclamation-triangle"></i> Loading API service...
                            <br><small>Please wait or refresh the page</small>
                        </td>
                    </tr>
                `);
                setTimeout(function () {
                    self.loadDonations();
                }, 1000);
                return;
            }

            tbody.html(`
                <tr>
                    <td colspan="7" class="text-center">
                        <div class="spinner-border text-primary" role="status"></div>
                    </td>
                </tr>
            `);

            const params = {
                page: this.currentPage,
                per_page: this.perPage,
                type: $('#filterType').val(),
                status: $('#filterStatus').val(),
                search: $('#searchInput').val()
            };

            DonationAPI.list(params)
                .then(function (response) {
                    if (response.success) {
                        self.donations = response.data.data;
                        self.permissions = response.permissions || {};
                        self.renderTable(response.data);
                    } else {
                        throw new Error(response.message || 'Failed to load donations');
                    }
                })
                .catch(function (error) {
                    console.error('Error loading donations:', error);
                    tbody.html(`
                        <tr>
                            <td colspan="7" class="text-center text-danger">
                                <i class="bi bi-exclamation-circle"></i> ${error.message || 'Failed to load donations'}
                            </td>
                        </tr>
                    `);

                    if (typeof Toast !== 'undefined') {
                        Toast.error(error.message || 'Failed to load donations');
                    }
                });
        },

        // Render table
        renderTable: function (data) {
            const self = this;
            const tbody = $('#donationsTableBody');

            if (!data.data || data.data.length === 0) {
                tbody.html(`
                    <tr>
                        <td colspan="7" class="text-center">
                            <i class="bi bi-inbox"></i> No donations found
                        </td>
                    </tr>
                `);
                $('#paginationInfo, #paginationControls').empty();
                return;
            }

            let html = '';
            const startIndex = (data.current_page - 1) * data.per_page;

            $.each(data.data, function (index, item) {
                const statusBadge = item.status == 1
                    ? '<span class="badge bg-success">Active</span>'
                    : '<span class="badge bg-danger">Inactive</span>';

                const typeLabel = item.type.charAt(0).toUpperCase() + item.type.slice(1);

                html += `
                    <tr>
                        <td>${startIndex + index + 1}</td>
                        <td><strong>${item.name}</strong></td>
                        <td>${item.secondary_name || '<span class="text-muted">-</span>'}</td>
                        <td><span class="badge bg-primary">${typeLabel}</span></td>
                        <td>${item.details || '<span class="text-muted">-</span>'}</td>
                        <td>${statusBadge}</td>
                        <td>
                            ${self.permissions.can_edit_donation_masters ?
                        `<button class="btn btn-sm btn-primary btn-edit me-1" data-id="${item.id}">
                                    <i class="bi bi-pencil"></i>
                                </button>` : ''}
                            ${self.permissions.can_delete_donation_masters ?
                        `<button class="btn btn-sm btn-danger btn-delete" data-id="${item.id}">
                                    <i class="bi bi-trash"></i>
                                </button>` : ''}
                        </td>
                    </tr>
                `;
            });

            tbody.html(html);
            this.renderPagination(data);
        },

        // Render pagination
        renderPagination: function (data) {
            const info = `Showing ${data.from || 0} to ${data.to || 0} of ${data.total || 0} entries`;
            $('#paginationInfo').html(info);

            let paginationHtml = '';

            paginationHtml += `
                <li class="page-item ${data.current_page === 1 ? 'disabled' : ''}">
                    <a class="page-link" href="#" data-page="${data.current_page - 1}">Previous</a>
                </li>
            `;

            for (let i = 1; i <= data.last_page; i++) {
                if (
                    i === 1 ||
                    i === data.last_page ||
                    (i >= data.current_page - 2 && i <= data.current_page + 2)
                ) {
                    paginationHtml += `
                        <li class="page-item ${i === data.current_page ? 'active' : ''}">
                            <a class="page-link" href="#" data-page="${i}">${i}</a>
                        </li>
                    `;
                } else if (i === data.current_page - 3 || i === data.current_page + 3) {
                    paginationHtml += `<li class="page-item disabled"><span class="page-link">...</span></li>`;
                }
            }

            paginationHtml += `
                <li class="page-item ${data.current_page === data.last_page ? 'disabled' : ''}">
                    <a class="page-link" href="#" data-page="${data.current_page + 1}">Next</a>
                </li>
            `;

            $('#paginationControls').html(paginationHtml);
        },

        // Show add modal
        showAddModal: function () {
            this.editMode = false;
            this.selectedDonation = null;

            $('#modalTitle').html('<i class="bi bi-plus-circle"></i> Add New Type');
            $('#donationForm')[0].reset();
            $('#donationForm').removeClass('was-validated');
            $('#donationStatus').val('1');

            this.modal = new bootstrap.Modal(document.getElementById('donationModal'));
            this.modal.show();
        },

        // Show edit modal
        showEditModal: function (id) {
            const donation = this.donations.find(d => d.id === id);

            if (!donation) {
                if (typeof Toast !== 'undefined') {
                    Toast.error('Donation not found');
                } else {
                    alert('Donation not found');
                }
                return;
            }

            this.editMode = true;
            this.selectedDonation = donation;

            $('#modalTitle').html('<i class="bi bi-pencil"></i> Edit Type');
            $('#donationName').val(donation.name);
            $('#donationSecondaryName').val(donation.secondary_name || '');
            $('#donationType').val(donation.type);
            $('#donationDetails').val(donation.details || '');
            $('#donationStatus').val(donation.status);

            this.modal = new bootstrap.Modal(document.getElementById('donationModal'));
            this.modal.show();
        },

        // Save donation
        saveDonation: function () {
            const self = this;
            const form = $('#donationForm')[0];

            if (!form.checkValidity()) {
                form.classList.add('was-validated');
                return;
            }

            const data = {
                name: $('#donationName').val().trim(),
                secondary_name: $('#donationSecondaryName').val().trim() || null,
                type: $('#donationType').val().trim().toLowerCase(),
                details: $('#donationDetails').val().trim(),
                status: parseInt($('#donationStatus').val())
            };

            // Disable button and show loading
            const $btnSave = $('#btnSave');
            $btnSave.prop('disabled', true).html('<span class="spinner-border spinner-border-sm me-1"></span> Saving...');

            console.log('Saving donation:', data);

            // Create timeout promise
            const timeoutPromise = new Promise((resolve, reject) => {
                setTimeout(() => reject(new Error('Request timeout - please try again')), 30000); // 30 seconds
            });

            // Get the API request
            const apiRequest = this.editMode
                ? DonationAPI.update(this.selectedDonation.id, data)
                : DonationAPI.create(data);

            // Race between API request and timeout
            Promise.race([apiRequest, timeoutPromise])
                .then(function (response) {
                    console.log('Save response:', response);
                    
                    if (response && response.success) {
                        if (typeof Toast !== 'undefined') {
                            Toast.success(response.message || 'Donation saved successfully');
                        } else {
                            alert(response.message || 'Donation saved successfully');
                        }
                        self.modal.hide();
                        self.loadTypes();
                        self.loadDonations();
                    } else {
                        throw new Error(response?.message || 'Failed to save donation');
                    }
                })
                .catch(function (error) {
                    console.error('Error saving donation:', error);
                    
                    // Extract meaningful error message
                    let errorMessage = 'Failed to save donation';
                    
                    if (error.message) {
                        errorMessage = error.message;
                    } else if (error.responseJSON && error.responseJSON.message) {
                        errorMessage = error.responseJSON.message;
                    } else if (error.statusText) {
                        errorMessage = error.statusText;
                    }
                    
                    if (typeof Toast !== 'undefined') {
                        Toast.error(errorMessage);
                    } else {
                        alert('Error: ' + errorMessage);
                    }
                })
                .finally(function () {
                    console.log('Resetting save button');
                    // Always reset button state
                    $btnSave.prop('disabled', false).html('<i class="bi bi-check-circle"></i> Save');
                });
        },

        // Delete donation
        deleteDonation: function (id) {
            const self = this;

            if (!confirm('Are you sure you want to delete this donation?')) {
                return;
            }

            DonationAPI.delete(id)
                .then(function (response) {
                    if (response.success) {
                        if (typeof Toast !== 'undefined') {
                            Toast.success(response.message || 'Donation deleted successfully');
                        } else {
                            alert(response.message || 'Donation deleted successfully');
                        }
                        self.loadTypes();
                        self.loadDonations();
                    } else {
                        throw new Error(response.message || 'Failed to delete donation');
                    }
                })
                .catch(function (error) {
                    console.error('Error deleting donation:', error);
                    if (typeof Toast !== 'undefined') {
                        Toast.error(error.message || 'Failed to delete donation');
                    } else {
                        alert('Error: ' + (error.message || 'Failed to delete donation'));
                    }
                });
        }
    };

})(jQuery, window);