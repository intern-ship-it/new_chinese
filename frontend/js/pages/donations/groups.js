// js/pages/donation/groups.js
// Donation Groups Management Page

(function ($, window) {
    'use strict';

    // Ensure DonationsSharedModule exists
    if (!window.DonationsSharedModule) {
        window.DonationsSharedModule = {
            moduleId: 'donations',
            eventNamespace: 'donations',
            cssId: 'donations-css',
            cssPath: '/css/donations.css',
            activePages: new Set(),

            loadCSS: function () {
                if (!document.getElementById(this.cssId)) {
                    const link = document.createElement('link');
                    link.id = this.cssId;
                    link.rel = 'stylesheet';
                    link.href = this.cssPath;
                    document.head.appendChild(link);
                    console.log('Donations CSS loaded');
                }
            },

            registerPage: function (pageId) {
                this.activePages.add(pageId);
                this.loadCSS();
                console.log(`Donations page registered: ${pageId} (Total: ${this.activePages.size})`);
            },

            unregisterPage: function (pageId) {
                this.activePages.delete(pageId);
                console.log(`Donations page unregistered: ${pageId} (Remaining: ${this.activePages.size})`);

                if (this.activePages.size === 0) {
                    this.cleanup();
                }
            },

            hasActivePages: function () {
                return this.activePages.size > 0;
            },

            getActivePages: function () {
                return Array.from(this.activePages);
            },

            cleanup: function () {
                const cssLink = document.getElementById(this.cssId);
                if (cssLink) {
                    cssLink.remove();
                    console.log('Donations CSS removed');
                }

                if (typeof gsap !== 'undefined') {
                    gsap.killTweensOf("*");
                }

                $(document).off('.' + this.eventNamespace);
                $(window).off('.' + this.eventNamespace);

                this.activePages.clear();
                console.log('Donations module cleaned up');
            }
        };
    }

    window.DonationGroupsPage = {
        pageId: 'donation-groups',
        eventNamespace: window.DonationsSharedModule.eventNamespace,
        currentUser: null,
        permissions: {},
        groups: [],
        selectedGroup: null,
        editMode: false,
        currentPage: 1,
        perPage: 20,
        totalRecords: 0,
        modal: null,

        // Initialize page
        init: function (params) {
            console.log('Initializing Donation Groups Page');
            window.DonationsSharedModule.registerPage(this.pageId);
            this.currentUser = JSON.parse(localStorage.getItem(window.APP_CONFIG.STORAGE.USER) || '{}');
            this.render();
            this.initAnimations();
            this.bindEvents();
            this.loadGroups();
        },

        // Cleanup
        cleanup: function () {
            console.log(`Cleaning up ${this.pageId}...`);

            window.DonationsSharedModule.unregisterPage(this.pageId);

            $(document).off(`.${this.eventNamespace}`);
            $(window).off(`.${this.eventNamespace}`);

            if (typeof gsap !== 'undefined') {
                gsap.killTweensOf(`.${this.pageId}-page *`);
            }

            if (this.modal) {
                this.modal.dispose();
                this.modal = null;
            }

            this.groups = [];
            this.permissions = {};

            console.log(`${this.pageId} cleanup completed`);
        },

        // Render page HTML
        render: function () {
            const html = `
                <div class="donation-groups-page">
                    <!-- Page Header with Animation -->
                    <div class="donations-header" data-aos="fade-down" data-aos-duration="1000">
                        <div class="donations-header-bg"></div>
                        <div class="container-fluid">
                            <div class="row align-items-center">
                                <div class="col-md-8">
                                    <div class="donations-title-wrapper">
                                        <i class="bi bi-collection donations-header-icon"></i>
                                        <div>
                                            <h1 class="donations-title">Donation Groups</h1>
                                            <p class="donations-subtitle">捐款分组 • Donation Group Management</p>
                                        </div>
                                    </div>
                                </div>
                                <div class="col-md-4 text-md-end">
                                    <div class="d-flex gap-2 justify-content-end">
                                        <button class="btn btn-light btn-lg" id="btnAddNew">
                                            <i class="bi bi-plus-circle me-2"></i>Add New Group
                                        </button>
                                    </div>
                                </div>
                            </div>
                        </div>
                    </div>

                    <!-- Filters Section -->
                    <div style="background: white; border-radius: 12px; padding: 25px; margin-bottom: 25px; box-shadow: 0 2px 8px rgba(0,0,0,0.08);">
                        <div class="row g-3">
                            <div class="col-md-3">
                                <label class="form-label" style="font-weight: 600; color: #495057; font-size: 13px;">Status</label>
                                <select class="form-select" id="filterStatus" style="border: 1px solid #dee2e6; border-radius: 6px;">
                                    <option value="">All Status</option>
                                    <option value="1">Active</option>
                                    <option value="0">Inactive</option>
                                </select>
                            </div>
                            <div class="col-md-6">
                                <label class="form-label" style="font-weight: 600; color: #495057; font-size: 13px;">Search</label>
                                <input type="text" class="form-control" id="searchInput" placeholder="Search by name..." style="border: 1px solid #dee2e6; border-radius: 6px;">
                            </div>
                            <div class="col-md-3 d-flex align-items-end">
                                <button class="btn w-100" id="btnSearch" style="background: #b8651b; color: white; border: none; border-radius: 6px; padding: 10px; font-weight: 600;">
                                    <i class="bi bi-search"></i> Search
                                </button>
                            </div>
                        </div>
                        <div class="row mt-2">
                            <div class="col-12">
                                <button class="btn btn-sm btn-outline-primary" id="btnClearFilters" style="border-radius: 6px;">
                                    <i class="bi bi-x-circle me-1"></i>Clear Filters
                                </button>
                                <button class="btn btn-sm btn-outline-primary ms-2" id="btnRefresh" style="border-radius: 6px;">
                                    <i class="bi bi-arrow-clockwise me-1"></i>Refresh
                                </button>
                            </div>
                        </div>
                    </div>

                    <!-- Table Section -->
                    <div style="background: white; border-radius: 12px; padding: 25px; box-shadow: 0 2px 8px rgba(0,0,0,0.08);">
                        <div class="d-flex justify-content-between align-items-center mb-3">
                            <div style="color: #495057; font-size: 14px;">
                                Show 
                                <select id="perPageSelect" style="border: 1px solid #dee2e6; border-radius: 4px; padding: 4px 8px; margin: 0 5px;">
                                    <option value="10">10</option>
                                    <option value="20" selected>20</option>
                                    <option value="50">50</option>
                                    <option value="100">100</option>
                                </select>
                                per page
                            </div>
                        </div>

                        <div class="table-responsive">
                            <table class="table table-hover mb-0" id="donationsTable">
                                <thead style="background: linear-gradient(135deg, #b8651b 0%, #d4782a 100%);">
                                    <tr>
                                        <th style="color: white; font-weight: 600; padding: 15px; border: none;" width="5%">#</th>
                                        <th style="color: white; font-weight: 600; padding: 15px; border: none;" width="35%">Primary Name</th>
                                        <th style="color: white; font-weight: 600; padding: 15px; border: none;" width="35%">Secondary Name</th>
                                        <th style="color: white; font-weight: 600; padding: 15px; border: none;" width="10%">Status</th>
                                        <th style="color: white; font-weight: 600; padding: 15px; border: none;" width="15%">Actions</th>
                                    </tr>
                                </thead>
                                <tbody id="groupsTableBody">
                                    <tr>
                                        <td colspan="5" class="text-center py-5">
                                            <div class="spinner-border text-primary" role="status">
                                                <span class="visually-hidden">Loading...</span>
                                            </div>
                                            <p class="mt-2 text-muted">Loading groups...</p>
                                        </td>
                                    </tr>
                                </tbody>
                            </table>
                        </div>

                        <!-- Pagination -->
                        <div class="d-flex justify-content-between align-items-center mt-3">
                            <div class="text-muted" style="font-size: 14px;">
                                Showing <span id="showingFrom">0</span> to <span id="showingTo">0</span> of <span id="totalRecords">0</span> entries
                            </div>
                            <nav>
                                <ul class="pagination mb-0" id="pagination">
                                    <!-- Pagination will be rendered here -->
                                </ul>
                            </nav>
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
                <div class="modal fade" id="groupModal" tabindex="-1" data-bs-backdrop="static">
                    <div class="modal-dialog modal-dialog-centered modal-lg">
                        <div class="modal-content">
                            <div class="modal-header" style="background: linear-gradient(135deg, #b8651b 0%, #d4782a 100%);">
                                <h5 class="modal-title text-white" id="modalTitle">
                                    <i class="bi bi-plus-circle me-2"></i>Add New Group
                                </h5>
                                <button type="button" class="btn-close btn-close-white" data-bs-dismiss="modal"></button>
                            </div>
                            <form id="groupForm">
                                <div class="modal-body">
                                    <div class="row">
                                        <!-- Primary Name -->
                                        <div class="col-md-12 mb-3">
                                            <label class="form-label required">Primary Name</label>
                                            <input type="text" class="form-control" id="groupName" required placeholder="Enter primary name">
                                            <div class="invalid-feedback">Please enter primary name</div>
                                        </div>

                                        <!-- Secondary Name -->
                                        <div class="col-md-12 mb-3">
                                            <label class="form-label">Secondary Name (Chinese)</label>
                                            <input type="text" class="form-control" id="groupSecondaryName" placeholder="输入中文名称 (Optional)">
                                            <small class="form-text text-muted">Optional alternative name in Chinese</small>
                                        </div>

                                        <!-- Status Checkbox -->
                                        <div class="col-md-12 mb-3">
                                            <div class="form-check form-switch">
                                                <input class="form-check-input" type="checkbox" id="groupStatus" checked style="width: 3rem; height: 1.5rem; cursor: pointer;">
                                                <label class="form-check-label ms-2" for="groupStatus" style="cursor: pointer;">
                                                    <strong id="statusLabel">Active</strong>
                                                </label>
                                            </div>
                                            <small class="form-text text-muted">Toggle to activate or deactivate this group</small>
                                        </div>
                                    </div>
                                </div>
                                <div class="modal-footer">
                                    <button type="button" class="btn btn-secondary" data-bs-dismiss="modal">
                                        <i class="bi bi-x-circle"></i> Cancel
                                    </button>
                                    <button type="submit" class="btn" id="btnSave" style="background: #b8651b; color: white;">
                                        <i class="bi bi-check-circle"></i> Save
                                    </button>
                                </div>
                            </form>
                        </div>
                    </div>
                </div>
            `;
        },

        // Initialize animations
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

        // Bind events
        bindEvents: function () {
            const self = this;

            $('#btnAddNew').on('click.' + this.eventNamespace, function () {
                self.showAddModal();
            });

            $('#btnSearch, #btnRefresh').on('click.' + this.eventNamespace, function () {
                self.currentPage = 1;
                self.loadGroups();
            });

            $('#btnClearFilters').on('click.' + this.eventNamespace, function () {
                $('#filterStatus').val('');
                $('#searchInput').val('');
                self.currentPage = 1;
                self.loadGroups();
            });

            $(document).on('submit.' + this.eventNamespace, '#groupForm', function (e) {
                e.preventDefault();
                self.saveGroup();
            });

            $(document).on('click.' + this.eventNamespace, '.btn-edit', function () {
                const id = $(this).data('id');
                self.showEditModal(id);
            });

            $(document).on('click.' + this.eventNamespace, '.btn-delete', function () {
                const id = $(this).data('id');
                self.deleteGroup(id);
            });

            $(document).on('click.' + this.eventNamespace, '#pagination a.page-link', function (e) {
                e.preventDefault();
                const page = parseInt($(this).data('page'));
                if (page && page !== self.currentPage) {
                    self.currentPage = page;
                    self.loadGroups();
                    $('html, body').animate({ scrollTop: 0 }, 300);
                }
            });

            $('#filterStatus').on('change.' + this.eventNamespace, function () {
                self.currentPage = 1;
                self.loadGroups();
            });

            let searchTimeout;
            $('#searchInput').on('keyup.' + this.eventNamespace, function () {
                clearTimeout(searchTimeout);
                searchTimeout = setTimeout(() => {
                    self.currentPage = 1;
                    self.loadGroups();
                }, 500);
            });

            $('#perPageSelect').on('change.' + this.eventNamespace, function () {
                self.perPage = parseInt($(this).val());
                self.currentPage = 1;
                self.loadGroups();
            });

            // Update status label when checkbox changes
            $(document).on('change.' + this.eventNamespace, '#groupStatus', function () {
                const isChecked = $(this).is(':checked');
                $('#statusLabel').text(isChecked ? 'Active' : 'Inactive');
            });

            $(document).on('hidden.bs.modal', '#groupModal', function () {
                $('#groupForm')[0].reset();
                $('#groupForm').removeClass('was-validated');
                $('#statusLabel').text('Active');
                self.editMode = false;
                self.selectedGroup = null;
            });
        },

        // Load groups
        loadGroups: async function () {
            const self = this;
            const tbody = $('#groupsTableBody');

            try {
                tbody.html(`
                    <tr>
                        <td colspan="5" class="text-center py-5">
                            <div class="spinner-border text-primary" role="status"></div>
                            <p class="mt-2 text-muted">Loading groups...</p>
                        </td>
                    </tr>
                `);

                const params = new URLSearchParams({
                    page: this.currentPage,
                    per_page: this.perPage
                });

                const status = $('#filterStatus').val();
                if (status !== '') params.append('status', status);

                const search = $('#searchInput').val();
                if (search) params.append('search', search);

                const response = await TempleAPI.get(`/donation-groups?${params.toString()}`);

                console.log('Groups response:', response);

                if (response.success) {
                    this.groups = response.data.data;
                    this.permissions = response.permissions || {};
                    this.renderTable(response.data);
                } else {
                    throw new Error(response.message || 'Failed to load groups');
                }
            } catch (error) {
                console.error('Error loading groups:', error);
                tbody.html(`
                    <tr>
                        <td colspan="5" class="text-center py-5">
                            <div class="alert alert-danger d-inline-block">
                                <i class="bi bi-exclamation-triangle-fill me-2"></i>
                                Failed to load groups. Please try again.
                            </div>
                        </td>
                    </tr>
                `);
                TempleCore.showToast('Failed to load groups', 'error');
            }
        },

        // Render table
        renderTable: function (data) {
            const self = this;
            const tbody = $('#groupsTableBody');

            if (!data.data || data.data.length === 0) {
                tbody.html(`
                    <tr>
                        <td colspan="5" class="text-center py-5">
                            <i class="bi bi-inbox fs-1 text-muted"></i>
                            <p class="mt-3 text-muted mb-1"><strong>No groups found</strong></p>
                            <p class="text-muted small">Click "Add New Group" to create your first donation group</p>
                        </td>
                    </tr>
                `);
                $('#showingFrom, #showingTo, #totalRecords').text('0');
                $('#pagination').empty();
                return;
            }

            const startIndex = (data.current_page - 1) * data.per_page;

            const rows = data.data.map((item, index) => {
                const statusBadge = item.status == 1
                    ? '<span class="badge bg-success"><i class="bi bi-check-circle me-1"></i>Active</span>'
                    : '<span class="badge bg-danger"><i class="bi bi-x-circle me-1"></i>Inactive</span>';

                const rowBg = index % 2 === 0 ? 'background: #fafafa;' : '';

                return `
                    <tr data-id="${item.id}" style="${rowBg} transition: all 0.2s;">
                        <td style="padding: 15px; border-bottom: 1px solid #eee;">${startIndex + index + 1}</td>
                        <td style="padding: 15px; border-bottom: 1px solid #eee;">
                            <strong style="color: #2d3748;">${item.name}</strong>
                        </td>
                        <td style="padding: 15px; border-bottom: 1px solid #eee;">
                            ${item.secondary_name ? `<span style="color: #4a5568;">${item.secondary_name}</span>` : '<span class="text-muted fst-italic">-</span>'}
                        </td>
                        <td style="padding: 15px; border-bottom: 1px solid #eee;">${statusBadge}</td>
                        <td style="padding: 15px; border-bottom: 1px solid #eee;">
                            <div class="btn-group btn-group-sm">
                                ${self.permissions.can_edit_donation_groups ?
                        `<button class="btn btn-outline-primary btn-edit" data-id="${item.id}" title="Edit" style="border-radius: 4px 0 0 4px;">
                                        <i class="bi bi-pencil"></i> Edit
                                    </button>` : ''}
                                ${self.permissions.can_delete_donation_groups ?
                        `<button class="btn btn-outline-danger btn-delete" data-id="${item.id}" title="Delete" style="border-radius: 0 4px 4px 0;">
                                        <i class="bi bi-trash"></i> Delete
                                    </button>` : ''}
                            </div>
                        </td>
                    </tr>
                `;
            }).join('');

            tbody.html(rows);
            this.renderPagination(data);

            // Add hover effect
            tbody.find('tr').hover(
                function () {
                    $(this).css('background', 'rgba(184, 101, 27, 0.05)');
                },
                function () {
                    const index = $(this).index();
                    $(this).css('background', index % 2 === 0 ? '#fafafa' : 'white');
                }
            );
        },

        // Render pagination
        renderPagination: function (pagination) {
            if (!pagination) return;

            this.totalRecords = pagination.total;
            const showingFrom = pagination.total > 0 ? (pagination.current_page - 1) * pagination.per_page + 1 : 0;
            const showingTo = Math.min(pagination.current_page * pagination.per_page, pagination.total);

            $('#showingFrom').text(showingFrom);
            $('#showingTo').text(showingTo);
            $('#totalRecords').text(pagination.total);

            const $pagination = $('#pagination');
            $pagination.empty();

            if (pagination.last_page <= 1) return;

            $pagination.append(`
                <li class="page-item ${pagination.current_page === 1 ? 'disabled' : ''}">
                    <a class="page-link" href="#" data-page="${pagination.current_page - 1}">Previous</a>
                </li>
            `);

            for (let i = 1; i <= pagination.last_page; i++) {
                if (
                    i === 1 ||
                    i === pagination.last_page ||
                    (i >= pagination.current_page - 2 && i <= pagination.current_page + 2)
                ) {
                    $pagination.append(`
                        <li class="page-item ${i === pagination.current_page ? 'active' : ''}">
                            <a class="page-link" href="#" data-page="${i}">${i}</a>
                        </li>
                    `);
                } else if (
                    i === pagination.current_page - 3 ||
                    i === pagination.current_page + 3
                ) {
                    $pagination.append(`<li class="page-item disabled"><span class="page-link">...</span></li>`);
                }
            }

            $pagination.append(`
                <li class="page-item ${pagination.current_page === pagination.last_page ? 'disabled' : ''}">
                    <a class="page-link" href="#" data-page="${pagination.current_page + 1}">Next</a>
                </li>
            `);
        },

        // Show add modal
        showAddModal: function () {
            this.editMode = false;
            this.selectedGroup = null;

            $('#modalTitle').html('<i class="bi bi-plus-circle me-2"></i>Add New Group');
            $('#groupForm')[0].reset();
            $('#groupForm').removeClass('was-validated');
            $('#groupStatus').prop('checked', true);
            $('#statusLabel').text('Active');

            this.modal = new bootstrap.Modal(document.getElementById('groupModal'));
            this.modal.show();
        },

        // Show edit modal
        showEditModal: function (id) {
            const group = this.groups.find(g => g.id === id);

            if (!group) {
                TempleCore.showToast('Group not found', 'error');
                return;
            }

            this.editMode = true;
            this.selectedGroup = group;

            $('#modalTitle').html('<i class="bi bi-pencil me-2"></i>Edit Group');
            $('#groupName').val(group.name);
            $('#groupSecondaryName').val(group.secondary_name || '');
            $('#groupStatus').prop('checked', group.status == 1);
            $('#statusLabel').text(group.status == 1 ? 'Active' : 'Inactive');

            this.modal = new bootstrap.Modal(document.getElementById('groupModal'));
            this.modal.show();
        },

        // Save group
        saveGroup: async function () {
            const self = this;
            const form = $('#groupForm')[0];

            if (!form.checkValidity()) {
                form.classList.add('was-validated');
                return;
            }

            const data = {
                name: $('#groupName').val().trim(),
                secondary_name: $('#groupSecondaryName').val().trim() || null,
                status: $('#groupStatus').is(':checked')
            };

            const $btnSave = $('#btnSave');
            $btnSave.prop('disabled', true).html('<span class="spinner-border spinner-border-sm me-1"></span> Saving...');

            try {
                let response;
                if (this.editMode) {
                    response = await TempleAPI.put(`/donation-groups/${this.selectedGroup.id}`, data);
                } else {
                    response = await TempleAPI.post('/donation-groups', data);
                }

                if (response.success) {
                    TempleCore.showToast(response.message || 'Group saved successfully', 'success');
                    this.modal.hide();
                    this.loadGroups();
                } else {
                    throw new Error(response.message || 'Failed to save group');
                }
            } catch (error) {
                console.error('Error saving group:', error);
                TempleCore.showToast(error.message || 'Failed to save group', 'error');
            } finally {
                $btnSave.prop('disabled', false).html('<i class="bi bi-check-circle"></i> Save');
            }
        },

        // Delete group
        deleteGroup: function (id) {
            const self = this;

            Swal.fire({
                title: 'Delete Group?',
                html: `
                    <p>Are you sure you want to delete this group?</p>
                    <p class="text-danger mb-0"><strong>This action cannot be undone!</strong></p>
                `,
                icon: 'warning',
                showCancelButton: true,
                confirmButtonColor: '#dc3545',
                cancelButtonColor: '#6c757d',
                confirmButtonText: '<i class="bi bi-trash me-2"></i>Yes, delete it!',
                cancelButtonText: '<i class="bi bi-x-circle me-2"></i>Cancel',
            }).then(async (result) => {
                if (result.isConfirmed) {
                    try {
                        Swal.fire({
                            title: 'Deleting...',
                            html: 'Please wait while we delete the group.',
                            allowOutsideClick: false,
                            allowEscapeKey: false,
                            showConfirmButton: false,
                            willOpen: () => {
                                Swal.showLoading();
                            }
                        });

                        const response = await TempleAPI.delete(`/donation-groups/${id}`);

                        if (response.success) {
                            Swal.fire({
                                title: 'Deleted!',
                                text: 'Group has been deleted successfully.',
                                icon: 'success',
                                timer: 2000,
                                showConfirmButton: false
                            });

                            self.loadGroups();
                        } else {
                            throw new Error(response.message || 'Failed to delete group');
                        }
                    } catch (error) {
                        console.error('Error deleting group:', error);
                        Swal.fire({
                            title: 'Error!',
                            text: 'Failed to delete group. ' + error.message,
                            icon: 'error',
                            confirmButtonText: 'OK'
                        });
                    }
                }
            });
        }
    };

})(jQuery, window);