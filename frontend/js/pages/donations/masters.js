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
                                            <th width="25%">Name</th>
                                            <th width="15%">Type</th>
                                            <th width="30%">Details</th>
                                            <th width="10%">Status</th>
                                            <th width="15%">Actions</th>
                                        </tr>
                                    </thead>
                                    <tbody id="donationsTableBody">
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
            this.updateTypeFilters();
        },

        // Update type filters with loaded types
        updateTypeFilters: function () {
            const filterSelect = $('#filterType');
            filterSelect.find('option:not(:first)').remove();

            this.types.forEach(function (type) {
                filterSelect.append(`<option value="${type}">${type.charAt(0).toUpperCase() + type.slice(1)}</option>`);
            });
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
                                        <!-- Name -->
                                        <div class="col-md-12 mb-3">
                                            <label class="form-label required">Name</label>
                                            <input type="text" class="form-control" id="donationName" required>
                                            <div class="invalid-feedback">Please enter donation name</div>
                                        </div>

                                        <!-- Type (with datalist for autocomplete) -->
                                        <div class="col-md-6 mb-3">
                                            <label class="form-label required">Type</label>
                                            <input type="text" 
                                                   class="form-control" 
                                                   id="donationType" 
                                                   list="typesList"
                                                   placeholder="Enter or select type"
                                                   required
                                                   maxlength="50">
                                            <datalist id="typesList"></datalist>
                                            <div class="invalid-feedback">Please enter donation type</div>
                                            <small class="form-text text-muted">Enter new type or select from existing</small>
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

        // Populate types datalist
        populateTypesDatalist: function () {
            const datalist = $('#typesList');
            datalist.empty();

            this.types.forEach(function (type) {
                datalist.append(`<option value="${type}">`);
            });
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
                        <td colspan="6" class="text-center text-warning">
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
                    <td colspan="6" class="text-center">
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
                            <td colspan="6" class="text-center text-danger">
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
                        <td colspan="6" class="text-center">
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

                html += `
                    <tr>
                        <td>${startIndex + index + 1}</td>
                        <td><strong>${item.name}</strong></td>
                        <td><span class="badge bg-primary">${item.type.charAt(0).toUpperCase() + item.type.slice(1)}</span></td>
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

            this.populateTypesDatalist();

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
            $('#donationType').val(donation.type);
            $('#donationDetails').val(donation.details || '');
            $('#donationStatus').val(donation.status);

            this.populateTypesDatalist();

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
                type: $('#donationType').val().trim().toLowerCase(),
                details: $('#donationDetails').val().trim(),
                status: parseInt($('#donationStatus').val())
            };

            $('#btnSave').prop('disabled', true).html('<span class="spinner-border spinner-border-sm me-1"></span> Saving...');

            const request = this.editMode
                ? DonationAPI.update(this.selectedDonation.id, data)
                : DonationAPI.create(data);

            request
                .then(function (response) {
                    if (response.success) {
                        if (typeof Toast !== 'undefined') {
                            Toast.success(response.message || 'Donation saved successfully');
                        } else {
                            alert(response.message || 'Donation saved successfully');
                        }
                        self.modal.hide();
                        self.loadTypes(); // Refresh types list
                        self.loadDonations();
                    } else {
                        throw new Error(response.message || 'Failed to save donation');
                    }
                })
                .catch(function (error) {
                    console.error('Error saving donation:', error);
                    if (typeof Toast !== 'undefined') {
                        Toast.error(error.message || 'Failed to save donation');
                    } else {
                        alert('Error: ' + (error.message || 'Failed to save donation'));
                    }
                })
                .finally(function () {
                    $('#btnSave').prop('disabled', false).html('<i class="bi bi-check-circle"></i> Save');
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
                        self.loadTypes(); // Refresh types list
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