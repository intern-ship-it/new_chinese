// frontend/js/pages/donation/masters.js
// Donation Masters Management Module with Enhanced UI - CORRECTED VERSION

(function ($, window) {
    'use strict';

    window.DonationMastersPage = {
        currentUser: null,
        permissions: {},
        donations: [],
        types: [],
        ledgers: [],
        donationGroups: [],
        selectedDonation: null,
        editMode: false,
        currentPage: 1,
        perPage: 20,
        modal: null,
        currentImageFile: null,
        currentImagePreview: null,

        // Helper to get API headers
        getApiHeaders: function () {
            const temple = JSON.parse(localStorage.getItem(window.APP_CONFIG.STORAGE.TEMPLE) || '{}');
            return {
                'Authorization': `Bearer ${localStorage.getItem(window.APP_CONFIG.STORAGE.ACCESS_TOKEN)}`,
                'X-Temple-ID': temple.id || temple.temple_id || ''
            };
        },

        // Initialize page
        init: function (params) {
            console.log('Initializing Donation Masters Page');
            this.currentUser = JSON.parse(localStorage.getItem(window.APP_CONFIG.STORAGE.USER) || '{}');
            this.loadCSS();
            this.render();
            this.initAnimations();
            this.bindEvents();
            this.loadLedgers();
            this.loadGroups();
            setTimeout(() => {
                this.loadDonations();
            }, 100);
        },

        // Cleanup
        cleanup: function () {
            $(document).off('click', '#btnAddNew');
            $(document).off('click', '#btnRefresh');
            $(document).off('click', '#btnSearch');
            $(document).off('submit', '#donationForm');
            $(document).off('click', '.btn-edit');
            $(document).off('click', '.btn-delete');
            $(document).off('click', '.page-link');
            $(document).off('click', '#btnUploadImage');
            $(document).off('change', '#donationImageFile');
            $(document).off('click', '#btnRemoveImage');
            $('#filterType, #filterStatus, #filterGroup').off('change');
            $('#searchInput').off('keypress');

            if (this.modal) {
                this.modal.dispose();
                this.modal = null;
            }

            if ($('#donationLedger').data('select2')) {
                $('#donationLedger').select2('destroy');
            }
            if ($('#donationGroup').data('select2')) {
                $('#donationGroup').select2('destroy');
            }

            const cssLink = document.getElementById('donations-css');
            if (cssLink) {
                cssLink.remove();
            }

            if (typeof gsap !== 'undefined') {
                gsap.killTweensOf('.donations-header-icon');
            }

            this.donations = [];
            this.types = [];
            this.ledgers = [];
            this.donationGroups = [];
            this.permissions = {};
            this.currentImageFile = null;
            this.currentImagePreview = null;
        },

        loadCSS: function () {
            if (!document.getElementById('donations-css')) {
                const link = document.createElement('link');
                link.id = 'donations-css';
                link.rel = 'stylesheet';
                link.href = '/css/donations.css';
                document.head.appendChild(link);
            }
        },

        loadLedgers: function () {
            const self = this;
            $.ajax({
                url: `${window.APP_CONFIG.API.BASE_URL}/donation-masters/ledgers`,
                method: 'GET',
                headers: self.getApiHeaders(),
                success: function (response) {
                    if (response.success) {
                        self.ledgers = response.data || [];
                        console.log('Loaded ledgers:', self.ledgers.length);
                    }
                },
                error: function (error) {
                    console.error('Error loading ledgers:', error);
                    if (typeof Toast !== 'undefined') {
                        Toast.error('Failed to load ledgers');
                    }
                }
            });
        },

        loadGroups: function () {
            const self = this;
            $.ajax({
                url: `${window.APP_CONFIG.API.BASE_URL}/donation-groups/active`,
                method: 'GET',
                headers: self.getApiHeaders(),
                success: function (response) {
                    if (response.success) {
                        self.donationGroups = response.data || [];
                        console.log('Loaded donation groups:', self.donationGroups.length);
                        
                        if ($('#filterGroup').length > 0) {
                            self.populateFilterGroups();
                        }
                    }
                },
                error: function (error) {
                    console.error('Error loading donation groups:', error);
                    if (typeof Toast !== 'undefined') {
                        Toast.error('Failed to load donation groups');
                    }
                }
            });
        },

        loadTypes: function () {
            const self = this;
            $.ajax({
                url: `${window.APP_CONFIG.API.BASE_URL}/donation-masters/types`,
                method: 'GET',
                headers: self.getApiHeaders(),
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

        render: function () {
            const html = `
                <div class="donation-masters-page">
                    <!-- Page Header -->
                    <div class="donations-header" data-aos="fade-down" data-aos-duration="1000">
                        <div class="donations-header-bg"></div>
                        <div class="container-fluid">
                            <div class="row align-items-center">
                                <div class="col-md-8">
                                    <div class="donations-title-wrapper">
                                        <i class="bi bi-gift-fill donations-header-icon"></i>
                                        <div>
                                            <h1 class="donations-title">Donation Masters</h1>
                                            <p class="donations-subtitle">捐款管理 • Temple Donation Masters Management</p>
                                        </div>
                                    </div>
                                </div>
                                <div class="col-md-4 text-md-end">
                                    <div class="d-flex gap-2 justify-content-end">
                                        <button class="btn btn-light btn-lg" id="btnAddNew">
                                            <i class="bi bi-plus-circle me-2"></i>Add New
                                        </button>
                                    </div>
                                </div>
                            </div>
                        </div>
                    </div>

                    <!-- Filters -->
                    <div class="card mb-4">
                        <div class="card-body">
                            <div class="row g-3">
                                <div class="col-md-3">
                                    <label class="form-label">Group</label>
                                    <select class="form-select" id="filterGroup">
                                        <option value="">All Groups</option>
                                    </select>
                                </div>
                                <div class="col-md-2">
                                    <label class="form-label">Status</label>
                                    <select class="form-select" id="filterStatus">
                                        <option value="">All Status</option>
                                        <option value="1">Active</option>
                                        <option value="0">Inactive</option>
                                    </select>
                                </div>
                                <div class="col-md-5">
                                    <label class="form-label">Search</label>
                                    <input type="text" class="form-control" id="searchInput" placeholder="Search by name...">
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
                                <table class="table table-hover align-middle">
                                    <thead>
                                        <tr>
                                            <th width="5%">#</th>
                                            <th width="8%">Image</th>
                                            <th width="18%">Primary Name</th>
                                            <th width="18%">Secondary Name</th>
                                            <th width="15%">Group</th>
                                            <th width="15%">Ledger</th>
                                            <th width="8%">Status</th>
                                            <th width="13%">Actions</th>
                                        </tr>
                                    </thead>
                                    <tbody id="donationsTableBody">
                                        <tr>
                                            <td colspan="8" class="text-center py-5">
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

        populateFilterGroups: function () {
            const $filterGroup = $('#filterGroup');
            $filterGroup.find('option:not(:first)').remove();
            
            this.donationGroups.forEach(function (group) {
                $filterGroup.append(
                    $('<option></option>')
                        .val(group.id)
                        .text(group.name + (group.secondary_name ? ` (${group.secondary_name})` : ''))
                );
            });
        },

        renderModal: function () {
            return `
                <div class="modal fade" id="donationModal" tabindex="-1" data-bs-backdrop="static" data-bs-keyboard="false">
                    <div class="modal-dialog modal-xl modal-dialog-centered">
                        <div class="modal-content">
                            <div class="modal-header bg-primary text-white">
                                <h5 class="modal-title" id="modalTitle">
                                    <i class="bi bi-plus-circle me-2"></i>Add New Donation Type
                                </h5>
                                <button type="button" class="btn-close btn-close-white" data-bs-dismiss="modal"></button>
                            </div>
                            <form id="donationForm">
                                <div class="modal-body" style="max-height: 70vh; overflow-y: auto;">
                                    <div class="row g-4">
                                        <!-- Left Column - Image Upload -->
                                        <div class="col-md-4">
                                            <div class="card h-100 shadow-sm">
                                                <div class="card-header bg-light">
                                                    <h6 class="mb-0"><i class="bi bi-image me-2"></i>Donation Image</h6>
                                                </div>
                                                <div class="card-body text-center">
                                                    <div class="image-upload-container">
                                                        <div class="image-preview-wrapper mb-3">
                                                            <div class="border rounded p-3 bg-light" style="min-height: 250px; display: flex; align-items: center; justify-content: center;">
                                                                <img id="imagePreview" 
                                                                     src="/images/placeholder-image.png" 
                                                                     alt="Preview" 
                                                                     class="img-fluid rounded"
                                                                     style="max-height: 220px; max-width: 100%; object-fit: contain;">
                                                            </div>
                                                        </div>
                                                        <div class="d-grid gap-2">
                                                            <input type="file" 
                                                                   class="d-none" 
                                                                   id="donationImageFile" 
                                                                   accept="image/jpeg,image/jpg,image/png,image/gif,image/webp">
                                                            <button type="button" 
                                                                    class="btn btn-outline-primary" 
                                                                    id="btnUploadImage">
                                                                <i class="bi bi-cloud-upload me-2"></i>Choose Image
                                                            </button>
                                                            <button type="button" 
                                                                    class="btn btn-outline-danger" 
                                                                    id="btnRemoveImage" 
                                                                    style="display: none;">
                                                                <i class="bi bi-trash me-2"></i>Remove Image
                                                            </button>
                                                            <small class="text-muted">
                                                                <i class="bi bi-info-circle me-1"></i>
                                                                JPG, PNG, GIF, WEBP (Max 2MB)
                                                            </small>
                                                        </div>
                                                    </div>
                                                </div>
                                            </div>
                                        </div>

                                        <!-- Right Column - Form Fields -->
                                        <div class="col-md-8">
                                            <div class="row g-3">
                                                <!-- Primary Name -->
                                                <div class="col-12">
                                                    <label class="form-label fw-semibold">
                                                        Primary Name <span class="text-danger">*</span>
                                                    </label>
                                                    <input type="text" 
                                                           class="form-control form-control-lg" 
                                                           id="donationName" 
                                                           placeholder="Enter primary name"
                                                           required>
                                                    <div class="invalid-feedback">Please enter primary name</div>
                                                </div>

                                                <!-- Secondary Name -->
                                                <div class="col-12">
                                                    <label class="form-label fw-semibold">
                                                        Secondary Name
                                                    </label>
                                                    <input type="text" 
                                                           class="form-control" 
                                                           id="donationSecondaryName" 
                                                           placeholder="Optional secondary name (e.g., Chinese translation)">
                                                    <small class="form-text text-muted">
                                                        <i class="bi bi-info-circle me-1"></i>
                                                        Optional alternative name or translation
                                                    </small>
                                                </div>

                                                <!-- Donation Group and Ledger Row -->
                                                <div class="col-md-6">
                                                    <label class="form-label fw-semibold">
                                                        Donation Group <span class="text-danger">*</span>
                                                    </label>
                                                    <select class="form-select" 
                                                            id="donationGroup" 
                                                            required 
                                                            style="width: 100%">
                                                        <option value="">Select Donation Group</option>
                                                    </select>
                                                    <div class="invalid-feedback">Please select a donation group</div>
                                                </div>

                                                <div class="col-md-6">
                                                    <label class="form-label fw-semibold">
                                                        Ledger <span class="text-danger">*</span>
                                                    </label>
                                                    <select class="form-select" 
                                                            id="donationLedger" 
                                                            required 
                                                            style="width: 100%">
                                                        <option value="">Select Ledger</option>
                                                    </select>
                                                    <div class="invalid-feedback">Please select a ledger</div>
                                                </div>

                                                <!-- Status -->
                                                <div class="col-md-6">
                                                    <label class="form-label fw-semibold">
                                                        Status <span class="text-danger">*</span>
                                                    </label>
                                                    <select class="form-select" id="donationStatus" required>
                                                        <option value="1">Active</option>
                                                        <option value="0">Inactive</option>
                                                    </select>
                                                </div>

                                                <!-- Details -->
                                                <div class="col-12">
                                                    <label class="form-label fw-semibold">Details</label>
                                                    <textarea class="form-control" 
                                                              id="donationDetails" 
                                                              rows="4" 
                                                              placeholder="Enter optional details or description..."></textarea>
                                                    <small class="form-text text-muted">
                                                        <i class="bi bi-info-circle me-1"></i>
                                                        Additional information about this donation type
                                                    </small>
                                                </div>
                                            </div>
                                        </div>
                                    </div>
                                </div>
                                <div class="modal-footer bg-light">
                                    <button type="button" class="btn btn-secondary" data-bs-dismiss="modal">
                                        <i class="bi bi-x-circle me-2"></i>Cancel
                                    </button>
                                    <button type="submit" class="btn btn-primary" id="btnSave">
                                        <i class="bi bi-check-circle me-2"></i>Save Donation Type
                                    </button>
                                </div>
                            </form>
                        </div>
                    </div>
                </div>
            `;
        },

        bindEvents: function () {
            const self = this;

            $(document).on('click', '#btnAddNew', function () {
                self.showAddModal();
            });

            $(document).on('click', '#btnRefresh', function () {
                self.loadTypes();
                self.loadDonations();
            });

            $(document).on('click', '#btnSearch', function () {
                self.currentPage = 1;
                self.loadDonations();
            });

            $(document).on('submit', '#donationForm', function (e) {
                e.preventDefault();
                self.saveDonation();
            });

            $(document).on('click', '.btn-edit', function () {
                const id = $(this).data('id');
                self.showEditModal(id);
            });

            $(document).on('click', '.btn-delete', function () {
                const id = $(this).data('id');
                self.deleteDonation(id);
            });

            $(document).on('click', '.page-link', function (e) {
                e.preventDefault();
                const page = $(this).data('page');
                if (page) {
                    self.currentPage = page;
                    self.loadDonations();
                }
            });

            $('#filterType, #filterStatus, #filterGroup').on('change', function () {
                self.currentPage = 1;
                self.loadDonations();
            });

            $('#searchInput').on('keypress', function (e) {
                if (e.which === 13) {
                    e.preventDefault();
                    self.currentPage = 1;
                    self.loadDonations();
                }
            });

            $(document).on('click', '#btnUploadImage', function () {
                $('#donationImageFile').click();
            });

            $(document).on('change', '#donationImageFile', function (e) {
                self.handleImageSelection(e.target.files[0]);
            });

            $(document).on('click', '#btnRemoveImage', function () {
                self.removeImage();
            });

            $(document).on('hidden.bs.modal', '#donationModal', function () {
                $('#donationForm')[0].reset();
                $('#donationForm').removeClass('was-validated');

                if ($('#donationLedger').data('select2')) {
                    $('#donationLedger').select2('destroy');
                }
                if ($('#donationGroup').data('select2')) {
                    $('#donationGroup').select2('destroy');
                }

                self.currentImageFile = null;
                self.currentImagePreview = null;
                $('#imagePreview').attr('src', '/images/placeholder-image.png');
                $('#btnRemoveImage').hide();

                self.editMode = false;
                self.selectedDonation = null;
            });
        },

        handleImageSelection: function (file) {
            const self = this;

            if (!file) return;

            const allowedTypes = ['image/jpeg', 'image/jpg', 'image/png', 'image/gif', 'image/webp'];
            if (!allowedTypes.includes(file.type)) {
                if (typeof Toast !== 'undefined') {
                    Toast.error('Invalid file type. Please upload JPG, PNG, GIF, or WEBP image.');
                } else {
                    alert('Invalid file type. Please upload JPG, PNG, GIF, or WEBP image.');
                }
                $('#donationImageFile').val('');
                return;
            }

            if (file.size > 2 * 1024 * 1024) {
                if (typeof Toast !== 'undefined') {
                    Toast.error('File size exceeds 2MB. Please upload a smaller image.');
                } else {
                    alert('File size exceeds 2MB. Please upload a smaller image.');
                }
                $('#donationImageFile').val('');
                return;
            }

            self.currentImageFile = file;

            const reader = new FileReader();
            reader.onload = function (e) {
                self.currentImagePreview = e.target.result;
                $('#imagePreview').attr('src', e.target.result);
                $('#btnRemoveImage').show();
            };
            reader.readAsDataURL(file);
        },

        removeImage: function () {
            this.currentImageFile = null;
            this.currentImagePreview = null;
            $('#imagePreview').attr('src', '/images/placeholder-image.png');
            $('#donationImageFile').val('');
            $('#btnRemoveImage').hide();
        },

        loadDonations: function () {
            const self = this;
            const tbody = $('#donationsTableBody');

            tbody.html(`
                <tr>
                    <td colspan="8" class="text-center py-5">
                        <div class="spinner-border text-primary" role="status"></div>
                    </td>
                </tr>
            `);

            const params = {
                page: this.currentPage,
                per_page: this.perPage,
                group_id: $('#filterGroup').val(),
                status: $('#filterStatus').val(),
                search: $('#searchInput').val()
            };

            $.ajax({
                url: `${window.APP_CONFIG.API.BASE_URL}/donation-masters`,
                method: 'GET',
                headers: self.getApiHeaders(),
                data: params,
                success: function (response) {
                    if (response.success) {
                        self.donations = response.data.data;
                        self.permissions = response.permissions || {};
                        self.renderTable(response.data);
                    } else {
                        throw new Error(response.message || 'Failed to load donations');
                    }
                },
                error: function (xhr) {
                    console.error('Error loading donations:', xhr);
                    const errorMsg = xhr.responseJSON?.message || 'Failed to load donations';
                    
                    tbody.html(`
                        <tr>
                            <td colspan="8" class="text-center text-danger py-5">
                                <i class="bi bi-exclamation-circle"></i> ${errorMsg}
                            </td>
                        </tr>
                    `);

                    if (typeof Toast !== 'undefined') {
                        Toast.error(errorMsg);
                    }
                }
            });
        },

        renderTable: function (data) {
            const self = this;
            const tbody = $('#donationsTableBody');

            if (!data.data || data.data.length === 0) {
                tbody.html(`
                    <tr>
                        <td colspan="8" class="text-center py-5">
                            <i class="bi bi-inbox fs-1 text-muted d-block mb-2"></i>
                            <span class="text-muted">No donations found</span>
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
                    ? '<span class="badge bg-success"><i class="bi bi-check-circle me-1"></i>Active</span>'
                    : '<span class="badge bg-danger"><i class="bi bi-x-circle me-1"></i>Inactive</span>';

                const groupInfo = item.group
                    ? `<div>${item.group.name}</div>${item.group.secondary_name ? `<small class="text-muted">${item.group.secondary_name}</small>` : ''}`
                    : '<span class="text-muted">-</span>';

                const ledgerInfo = item.ledger
                    ? `<div>${item.ledger.left_code}</div><small class="text-muted">${item.ledger.name}</small>`
                    : '<span class="text-muted">-</span>';

                const imageHtml = item.image_url
                    ? `<img src="${item.image_url}" alt="${item.name}" class="img-thumbnail" style="width: 60px; height: 60px; object-fit: cover; cursor: pointer;" onclick="window.open('${item.image_url}', '_blank')">`
                    : '<div class="text-center text-muted" style="width: 60px; height: 60px; display: flex; align-items: center; justify-content: center; border: 1px dashed #ddd; border-radius: 4px;"><i class="bi bi-image"></i></div>';

                html += `
                    <tr>
                        <td class="text-center">${startIndex + index + 1}</td>
                        <td class="text-center">${imageHtml}</td>
                        <td><strong>${item.name}</strong></td>
                        <td>${item.secondary_name || '<span class="text-muted">-</span>'}</td>
                        <td>${groupInfo}</td>
                        <td>${ledgerInfo}</td>
                        <td class="text-center">${statusBadge}</td>
                        <td class="text-center">
                            <div class="btn-group" role="group">
                                ${self.permissions.can_edit_donation_masters ?
                        `<button class="btn btn-sm btn-outline-primary btn-edit" data-id="${item.id}" title="Edit">
                                        <i class="bi bi-pencil"></i>
                                    </button>` : ''}
                                ${self.permissions.can_delete_donation_masters ?
                        `<button class="btn btn-sm btn-outline-danger btn-delete" data-id="${item.id}" title="Delete">
                                        <i class="bi bi-trash"></i>
                                    </button>` : ''}
                            </div>
                        </td>
                    </tr>
                `;
            });

            tbody.html(html);
            this.renderPagination(data);
        },

        renderPagination: function (data) {
            const info = `Showing ${data.from || 0} to ${data.to || 0} of ${data.total || 0} entries`;
            $('#paginationInfo').html(info);

            let paginationHtml = '';

            paginationHtml += `
                <li class="page-item ${data.current_page === 1 ? 'disabled' : ''}">
                    <a class="page-link" href="#" data-page="${data.current_page - 1}">
                        <i class="bi bi-chevron-left"></i>
                    </a>
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
                    <a class="page-link" href="#" data-page="${data.current_page + 1}">
                        <i class="bi bi-chevron-right"></i>
                    </a>
                </li>
            `;

            $('#paginationControls').html(paginationHtml);
        },

        initAnimations: function () {
            if (typeof AOS !== 'undefined') {
                AOS.init({
                    duration: 800,
                    easing: 'ease-in-out',
                    once: true,
                    offset: 50
                });
            }

            if (typeof gsap !== 'undefined') {
                gsap.to('.donations-header-icon', {
                    y: -10,
                    duration: 2,
                    repeat: -1,
                    yoyo: true,
                    ease: 'power1.inOut'
                });
            }
        },

        initGroupSelect2: function () {
            const self = this;

            console.log('Initializing Group Select2. Available groups:', self.donationGroups.length);

            if ($('#donationGroup').data('select2')) {
                $('#donationGroup').select2('destroy');
            }

            $('#donationGroup').empty();
            $('#donationGroup').append('<option value="">Select Donation Group</option>');

            self.donationGroups.forEach(function (group) {
                $('#donationGroup').append(
                    $('<option></option>')
                        .val(group.id)
                        .text(`${group.name}${group.secondary_name ? ` (${group.secondary_name})` : ''}`)
                );
            });

            console.log('Group dropdown options added:', $('#donationGroup option').length);

            $('#donationGroup').select2({
                dropdownParent: $('#donationModal'),
                placeholder: 'Select Donation Group',
                allowClear: true,
                width: '100%',
                theme: 'bootstrap-5'
            });

            console.log('Group Select2 initialized');
        },

        initLedgerSelect2: function () {
            const self = this;

            console.log('Initializing Ledger Select2. Available ledgers:', self.ledgers.length);

            if ($('#donationLedger').data('select2')) {
                $('#donationLedger').select2('destroy');
            }

            $('#donationLedger').empty();
            $('#donationLedger').append('<option value="">Select Ledger</option>');

            self.ledgers.forEach(function (ledger) {
                $('#donationLedger').append(
                    $('<option></option>')
                        .val(ledger.id)
                        .text(`${ledger.left_code} - ${ledger.name}`)
                );
            });

            console.log('Ledger dropdown options added:', $('#donationLedger option').length);

            $('#donationLedger').select2({
                dropdownParent: $('#donationModal'),
                placeholder: 'Select Ledger',
                allowClear: true,
                width: '100%',
                theme: 'bootstrap-5'
            });

            console.log('Ledger Select2 initialized');
        },

        showAddModal: function () {
            const self = this;
            
            this.editMode = false;
            this.selectedDonation = null;

            $('#modalTitle').html('<i class="bi bi-plus-circle me-2"></i>Add New Donation Type');
            $('#donationForm')[0].reset();
            $('#donationForm').removeClass('was-validated');
            $('#donationStatus').val('1');

            this.removeImage();

            this.modal = new bootstrap.Modal(document.getElementById('donationModal'));
            this.modal.show();

            $('#donationModal').one('shown.bs.modal', function () {
                console.log('Modal shown, initializing dropdowns...');
                
                if (self.donationGroups.length === 0) {
                    console.warn('Donation groups not loaded yet, loading now...');
                    self.loadGroups();
                    setTimeout(function() {
                        self.initGroupSelect2();
                    }, 500);
                } else {
                    self.initGroupSelect2();
                }

                if (self.ledgers.length === 0) {
                    console.warn('Ledgers not loaded yet, loading now...');
                    self.loadLedgers();
                    setTimeout(function() {
                        self.initLedgerSelect2();
                    }, 500);
                } else {
                    self.initLedgerSelect2();
                }
            });
        },

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

            $('#modalTitle').html('<i class="bi bi-pencil me-2"></i>Edit Donation Type');
            $('#donationName').val(donation.name);
            $('#donationSecondaryName').val(donation.secondary_name || '');
            $('#donationDetails').val(donation.details || '');
            $('#donationStatus').val(donation.status);

            if (donation.image_url) {
                $('#imagePreview').attr('src', donation.image_url);
                $('#btnRemoveImage').show();
                this.currentImagePreview = donation.image_url;
            } else {
                this.removeImage();
            }

            this.modal = new bootstrap.Modal(document.getElementById('donationModal'));
            this.modal.show();

            const self = this;
            $('#donationModal').one('shown.bs.modal', function () {
                console.log('Edit modal shown, initializing dropdowns...');
                
                self.initGroupSelect2();
                self.initLedgerSelect2();
                
                setTimeout(function() {
                    if (donation.group_id) {
                        $('#donationGroup').val(donation.group_id).trigger('change');
                        console.log('Set group_id:', donation.group_id);
                    }
                    if (donation.ledger_id) {
                        $('#donationLedger').val(donation.ledger_id).trigger('change');
                        console.log('Set ledger_id:', donation.ledger_id);
                    }
                }, 100);
            });
        },

        saveDonation: function () {
            const self = this;
            const form = $('#donationForm')[0];

            if (!form.checkValidity()) {
                form.classList.add('was-validated');
                console.error('Form validation failed');
                return;
            }

            const name = $('#donationName').val().trim();
            const secondaryName = $('#donationSecondaryName').val().trim() || '';
            const groupId = $('#donationGroup').val();
            const ledgerId = $('#donationLedger').val();
            const details = $('#donationDetails').val().trim();
            const status = $('#donationStatus').val();

            console.log('Form values:', {
                name: name,
                secondaryName: secondaryName,
                groupId: groupId,
                ledgerId: ledgerId,
                details: details,
                status: status,
                hasImage: !!self.currentImageFile
            });

            if (!name) {
                if (typeof Toast !== 'undefined') {
                    Toast.error('Please enter donation name');
                } else {
                    alert('Please enter donation name');
                }
                return;
            }

            if (!groupId) {
                if (typeof Toast !== 'undefined') {
                    Toast.error('Please select donation group');
                } else {
                    alert('Please select donation group');
                }
                return;
            }

            if (!ledgerId) {
                if (typeof Toast !== 'undefined') {
                    Toast.error('Please select ledger');
                } else {
                    alert('Please select ledger');
                }
                return;
            }

            const $btnSave = $('#btnSave');
            $btnSave.prop('disabled', true).html('<span class="spinner-border spinner-border-sm me-2"></span>Saving...');

            const formData = new FormData();
            formData.append('name', name);
            formData.append('secondary_name', secondaryName);
            formData.append('group_id', groupId);
            formData.append('ledger_id', ledgerId);
            formData.append('details', details);
            formData.append('status', status);

            if (self.currentImageFile) {
                formData.append('image', self.currentImageFile);
            }

            if (self.editMode && self.currentImagePreview && !self.currentImageFile) {
                formData.append('keep_existing_image', '1');
            }

            console.log('Submitting FormData...');
            for (let pair of formData.entries()) {
                console.log(pair[0] + ': ' + pair[1]);
            }

            // CRITICAL: Direct AJAX call with proper FormData settings
            const ajaxSettings = {
                url: self.editMode 
                    ? `${window.APP_CONFIG.API.BASE_URL}/donation-masters/${self.selectedDonation.id}`
                    : `${window.APP_CONFIG.API.BASE_URL}/donation-masters`,
                method: 'POST',
                headers: self.getApiHeaders(),
                data: formData,
                contentType: false,  // REQUIRED for FormData
                processData: false,  // REQUIRED for FormData
                cache: false,        // Prevents caching
                success: function (response) {
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
                },
                error: function (xhr) {
                    console.error('Error saving donation:', xhr);

                    let errorMessage = 'Failed to save donation';

                    if (xhr.responseJSON) {
                        if (xhr.responseJSON.message) {
                            errorMessage = xhr.responseJSON.message;
                        }
                        
                        if (xhr.responseJSON.errors) {
                            console.error('Validation errors:', xhr.responseJSON.errors);
                            const errors = xhr.responseJSON.errors;
                            const errorList = Object.keys(errors).map(key => errors[key][0]).join('\n');
                            errorMessage += '\n\n' + errorList;
                        }
                    } else if (xhr.statusText) {
                        errorMessage = xhr.statusText;
                    }

                    if (typeof Toast !== 'undefined') {
                        Toast.error(errorMessage);
                    } else {
                        alert('Error: ' + errorMessage);
                    }
                }
            };

            // For edit mode, add method override
            if (self.editMode) {
                ajaxSettings.headers['X-HTTP-Method-Override'] = 'PUT';
            }

            $.ajax(ajaxSettings)
                .always(function () {
                    console.log('Resetting save button');
                    $btnSave.prop('disabled', false).html('<i class="bi bi-check-circle me-2"></i>Save Donation Type');
                });
        },

        deleteDonation: function (id) {
            const self = this;

            if (!confirm('Are you sure you want to delete this donation? This will also remove the associated image.')) {
                return;
            }

            $.ajax({
                url: `${window.APP_CONFIG.API.BASE_URL}/donation-masters/${id}`,
                method: 'DELETE',
                headers: self.getApiHeaders(),
                success: function (response) {
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
                },
                error: function (xhr) {
                    console.error('Error deleting donation:', xhr);
                    const errorMsg = xhr.responseJSON?.message || 'Failed to delete donation';
                    
                    if (typeof Toast !== 'undefined') {
                        Toast.error(errorMsg);
                    } else {
                        alert('Error: ' + errorMsg);
                    }
                }
            });
        }
    };

})(jQuery, window);