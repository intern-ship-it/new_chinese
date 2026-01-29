// js/pages/auspicious-light/towers.js
// Pagoda Tower & Block Management - Admin page for managing tower structure

(function ($, window) {
    'use strict';

    window.PagodaTowersPage = {
        currentView: 'towers', // 'towers' or 'blocks'

        // Initialize page
        init: function (params) {
            console.log('Initializing Pagoda Tower Management');
            this.params = params || {};
            this.render();
            this.loadTowers();
            this.attachEvents();
        },
        // Render page structure - REDESIGNED WITHOUT AOS
        render: function () {
            const html = `
                <div class="towers-management-container">
                    
                    <!-- Page Header -->
                    <div class="page-header mb-4">
                        <div class="d-flex justify-content-between align-items-center flex-wrap">
                            <div>
                                <h1 class="page-title mb-2">
                                    <i class="bi bi-building me-2"></i>
                                    Tower & Block Management
                                </h1>
                                <p class="text-muted mb-0">塔楼管理 - Manage pagoda tower structure and blocks</p>
                            </div>
                            <div class="d-flex gap-2 mt-3 mt-md-0">
                                <button class="btn btn-outline-secondary" id="btnRefresh">
                                    <i class="bi bi-arrow-clockwise"></i> Refresh
                                </button>
                                <button class="btn btn-success" id="btnAddTower">
                                    <i class="bi bi-plus-circle"></i> Add Tower
                                </button>
                            </div>
                        </div>
                    </div>

                    <!-- View Toggle with Modern Design -->
                    <div class="card mb-4 shadow-sm">
                        <div class="card-body">
                            <div class="btn-group w-100" role="group">
                                <button type="button" class="btn btn-lg btn-outline-primary active" data-view="towers" id="btnViewTowers">
                                    <i class="bi bi-building me-2"></i>
                                    <span class="d-none d-md-inline">Towers</span>
                                    <span class="d-inline d-md-none">Towers</span>
                                </button>
                                <button type="button" class="btn btn-lg btn-outline-primary" data-view="blocks" id="btnViewBlocks">
                                    <i class="bi bi-grid-3x3 me-2"></i>
                                    <span class="d-none d-md-inline">Blocks</span>
                                    <span class="d-inline d-md-none">Blocks</span>
                                </button>
                            </div>
                        </div>
                    </div>

                    <!-- Content Container -->
                    <div id="contentContainer"></div>

                </div>

                <!-- Custom CSS for Interactive UI -->
                <style>
                    .tower-card {
                        transition: all 0.3s ease;
                        border: 2px solid transparent;
                    }
                    .tower-card:hover {
                        transform: translateY(-5px);
                        box-shadow: 0 8px 25px rgba(0,0,0,0.15) !important;
                        border-color: var(--bs-primary);
                    }
                    .tower-card .card-header {
                        background: linear-gradient(135deg, #0d6efd 0%, #0a58ca 100%);
                    }
                    .stat-box {
                        transition: all 0.2s ease;
                        background: #f8f9fa;
                    }
                    .stat-box:hover {
                        background: #e9ecef;
                        transform: scale(1.05);
                    }
                    .stat-box h4 {
                        color: var(--bs-primary);
                        font-weight: 700;
                    }
                    .btn-view-blocks {
                        transition: all 0.2s ease;
                    }
                    .btn-view-blocks:hover {
                        transform: translateX(5px);
                    }
                    .table-hover tbody tr {
                        transition: all 0.2s ease;
                    }
                    .table-hover tbody tr:hover {
                        background-color: rgba(13, 110, 253, 0.05);
                        transform: scale(1.01);
                        box-shadow: 0 2px 8px rgba(0,0,0,0.1);
                    }
                    .badge {
                        padding: 0.5em 0.8em;
                        font-weight: 600;
                    }
                    .btn-group-sm .btn {
                        transition: all 0.2s ease;
                    }
                    .btn-group-sm .btn:hover {
                        transform: scale(1.1);
                    }
                    #contentContainer {
                        animation: fadeIn 0.4s ease-in;
                    }
                    @keyframes fadeIn {
                        from { opacity: 0; transform: translateY(10px); }
                        to { opacity: 1; transform: translateY(0); }
                    }
                    .view-toggle-btn {
                        position: relative;
                        overflow: hidden;
                    }
                    .view-toggle-btn::before {
                        content: '';
                        position: absolute;
                        top: 50%;
                        left: 50%;
                        width: 0;
                        height: 0;
                        border-radius: 50%;
                        background: rgba(13, 110, 253, 0.1);
                        transform: translate(-50%, -50%);
                        transition: width 0.6s, height 0.6s;
                    }
                    .view-toggle-btn:hover::before {
                        width: 300px;
                        height: 300px;
                    }
                </style>
            `;

            $('#page-container').html(html);
        },


        // Load towers
        loadTowers: function () {
            const self = this;

            TempleUtils.showLoading('Loading towers...');

            PagodaAPI.towers.getAll()
                .done(function (response) {
                    if (response.success && response.data) {
                        const towers = Array.isArray(response.data) ? response.data : response.data.data || [];
                        self.renderTowers(towers);
                    } else {
                        self.showNoResults('towers');
                    }
                })
                .fail(function (xhr) {
                    TempleUtils.handleAjaxError(xhr, 'Failed to load towers');
                    self.showNoResults('towers');
                })
                .always(function () {
                    TempleUtils.hideLoading();
                });
        },


        // Render towers view
        renderTowers: function (towers) {
            if (!towers || towers.length === 0) {
                this.showNoResults('towers');
                return;
            }

            const cardsHtml = towers.map(tower => `
                <div class="col-md-6 col-lg-4 mb-4">
                    <div class="card tower-card h-100 shadow-sm">
                        <div class="card-header text-white position-relative">
                            <div class="d-flex justify-content-between align-items-center">
                                <div>
                                    <h5 class="mb-0 fw-bold">
                                        <i class="bi bi-building-fill me-2"></i>${tower.tower_name}
                                    </h5>
                                    <small class="opacity-75">Tower ID: ${tower.tower_code}</small>
                                </div>
                                <div class="btn-group btn-group-sm">
                                    <button class="btn btn-sm btn-light btn-edit-tower" data-id="${tower.id}" title="Edit Tower">
                                        <i class="bi bi-pencil-fill"></i>
                                    </button>
                                    <button class="btn btn-sm btn-danger btn-delete-tower" data-id="${tower.id}" title="Delete Tower">
                                        <i class="bi bi-trash-fill"></i>
                                    </button>
                                </div>
                            </div>
                        </div>
                        <div class="card-body">
                            <div class="mb-3">
                                <span class="badge bg-secondary-subtle text-secondary-emphasis border">
                                    <i class="bi bi-tag-fill me-1"></i>Code: ${tower.tower_code}
                                </span>
                            </div>
                            
                            <div class="row g-3 mb-3">
                                <div class="col-6">
                                    <div class="stat-box text-center p-3 border rounded-3">
                                        <i class="bi bi-grid-3x3-gap text-primary fs-4 mb-2"></i>
                                        <h4 class="mb-1">${tower.total_blocks || 0}</h4>
                                        <small class="text-muted fw-semibold">Blocks</small>
                                    </div>
                                </div>
                                <div class="col-6">
                                    <div class="stat-box text-center p-3 border rounded-3">
                                        <i class="bi bi-lightbulb text-warning fs-4 mb-2"></i>
                                        <h4 class="mb-1">${tower.total_lights || 0}</h4>
                                        <small class="text-muted fw-semibold">Lights</small>
                                    </div>
                                </div>
                            </div>

                            ${tower.description ? `
                                <div class="alert alert-light border mb-3">
                                    <small class="text-muted"><i class="bi bi-info-circle me-1"></i>${tower.description}</small>
                                </div>
                            ` : ''}

                            <div class="d-flex justify-content-between align-items-center">
                                <span class="badge ${tower.status === 'active' ? 'bg-success' : 'bg-secondary'} fs-6">
                                    <i class="bi bi-${tower.status === 'active' ? 'check-circle-fill' : 'x-circle-fill'} me-1"></i>
                                    ${tower.status === 'active' ? 'Active' : 'Inactive'}
                                </span>
                                <button class="btn btn-sm btn-primary btn-view-blocks" data-id="${tower.id}">
                                    <i class="bi bi-grid-3x3-gap-fill me-1"></i> View Blocks
                                    <i class="bi bi-arrow-right ms-1"></i>
                                </button>
                            </div>
                        </div>
                        <div class="card-footer bg-light text-muted small">
                            <i class="bi bi-clock me-1"></i>
                            Last updated: ${tower.updated_at ? moment(tower.updated_at).fromNow() : 'N/A'}
                        </div>
                    </div>
                </div>
            `).join('');

            const html = `
                <div class="row">
                    ${cardsHtml}
                </div>
            `;

            $('#contentContainer').html(html);
        },

        // Load blocks
        loadBlocks: function (towerId = null) {
            const self = this;

            TempleUtils.showLoading('Loading blocks...');

            const promise = towerId ?
                PagodaAPI.blocks.getByTower(towerId) :
                PagodaAPI.blocks.getAll();

            promise
                .done(function (response) {
                    if (response.success && response.data) {
                        const blocks = Array.isArray(response.data) ? response.data : response.data.data || [];
                        self.renderBlocks(blocks);
                    } else {
                        self.showNoResults('blocks');
                    }
                })
                .fail(function (xhr) {
                    TempleUtils.handleAjaxError(xhr, 'Failed to load blocks');
                    self.showNoResults('blocks');
                })
                .always(function () {
                    TempleUtils.hideLoading();
                });
        },
        // Render blocks view - IMPROVED DESIGN
        renderBlocks: function (blocks) {
            if (!blocks || blocks.length === 0) {
                this.showNoResults('blocks');
                return;
            }

            const tableRows = blocks.map((block, index) => `
                <tr class="align-middle">
                    <td>
                        <div class="d-flex align-items-center">
                            <div class="avatar-sm bg-primary text-white rounded-circle d-flex align-items-center justify-content-center me-3">
                                <strong>${index + 1}</strong>
                            </div>
                            <div>
                                <strong class="d-block">${block.block_name}</strong>
                                <small class="text-muted">Block ${block.block_code}</small>
                            </div>
                        </div>
                    </td>
                    <td>
                        <span class="badge bg-secondary-subtle text-secondary-emphasis border">
                            ${block.block_code}
                        </span>
                    </td>
                    <td>
                        <i class="bi bi-building text-primary me-2"></i>
                        <strong>${block.tower_name || block.tower?.tower_name || '-'}</strong>
                    </td>
                    <td class="text-center">
                        <span class="badge bg-info-subtle text-info-emphasis border">
                            ${block.total_floors || 0} Floors
                        </span>
                    </td>
                    <td class="text-center">
                        <span class="badge bg-warning-subtle text-warning-emphasis border">
                            ${block.rags_per_floor || 0}/Floor
                        </span>
                    </td>
                    <td class="text-center">
                        <strong class="text-primary fs-5">
                            <i class="bi bi-lightbulb-fill me-1"></i>
                            ${block.total_capacity || block.total_lights || 0}
                        </strong>
                    </td>
                    <td>
                        <span class="badge ${block.status === 'active' ? 'bg-success' : 'bg-secondary'} fs-6">
                            <i class="bi bi-${block.status === 'active' ? 'check-circle-fill' : 'x-circle-fill'} me-1"></i>
                            ${block.status === 'active' ? 'Active' : 'Inactive'}
                        </span>
                    </td>
                    <td>
                        <div class="btn-group btn-group-sm">
                            <button class="btn btn-outline-primary btn-view-block" data-id="${block.id}" title="View Details">
                                <i class="bi bi-eye-fill"></i>
                            </button>
                            <button class="btn btn-outline-secondary btn-edit-block" data-id="${block.id}" title="Edit Block">
                                <i class="bi bi-pencil-fill"></i>
                            </button>
                            <button class="btn btn-outline-danger btn-delete-block" data-id="${block.id}" title="Delete Block">
                                <i class="bi bi-trash-fill"></i>
                            </button>
                        </div>
                    </td>
                </tr>
            `).join('');

            const html = `
                <div class="card shadow-sm">
                    <div class="card-header bg-primary text-white d-flex justify-content-between align-items-center">
                        <h5 class="mb-0">
                            <i class="bi bi-grid-3x3-gap-fill me-2"></i>
                            All Blocks
                            <span class="badge bg-light text-primary ms-2">${blocks.length}</span>
                        </h5>
                        <button class="btn btn-sm btn-success" id="btnAddBlock">
                            <i class="bi bi-plus-circle-fill me-1"></i> Add Block
                        </button>
                    </div>
                    <div class="card-body p-0">
                        <div class="table-responsive">
                            <table class="table table-hover mb-0">
                                <thead class="table-light">
                                    <tr>
                                        <th><i class="bi bi-grid me-2"></i>Block Name</th>
                                        <th><i class="bi bi-tag me-2"></i>Code</th>
                                        <th><i class="bi bi-building me-2"></i>Tower</th>
                                        <th class="text-center"><i class="bi bi-layers me-2"></i>Floors</th>
                                        <th class="text-center"><i class="bi bi-lightbulb me-2"></i>Lights/Floor</th>
                                        <th class="text-center"><i class="bi bi-calculator me-2"></i>Total Capacity</th>
                                        <th><i class="bi bi-toggle-on me-2"></i>Status</th>
                                        <th><i class="bi bi-gear me-2"></i>Actions</th>
                                    </tr>
                                </thead>
                                <tbody>
                                    ${tableRows}
                                </tbody>
                            </table>
                        </div>
                    </div>
                </div>

                <style>
                    .avatar-sm {
                        width: 40px;
                        height: 40px;
                        font-size: 14px;
                        font-weight: 700;
                    }
                </style>
            `;

            $('#contentContainer').html(html);
        },

        // Show no results - IMPROVED DESIGN
        showNoResults: function (type) {
            const message = type === 'towers' ? 'No towers found' : 'No blocks found';
            const icon = type === 'towers' ? 'building' : 'grid-3x3';
            const addButton = type === 'towers' ?
                '<button class="btn btn-primary btn-lg" id="btnAddTowerNoResults"><i class="bi bi-plus-circle-fill me-2"></i> Add First Tower</button>' :
                '<button class="btn btn-primary btn-lg" id="btnAddBlockNoResults"><i class="bi bi-plus-circle-fill me-2"></i> Add First Block</button>';

            $('#contentContainer').html(`
                <div class="card shadow-sm">
                    <div class="card-body text-center py-5">
                        <div class="empty-state">
                            <i class="bi bi-${icon} display-1 text-muted mb-4 d-block"></i>
                            <h4 class="text-muted mb-3">${message}</h4>
                            <p class="text-muted mb-4">Get started by creating your first ${type === 'towers' ? 'tower' : 'block'}</p>
                            ${addButton}
                        </div>
                    </div>
                </div>

                <style>
                    .empty-state i {
                        opacity: 0.3;
                        animation: pulse 2s infinite;
                    }
                    @keyframes pulse {
                        0%, 100% { opacity: 0.3; }
                        50% { opacity: 0.5; }
                    }
                </style>
            `);
        },
        // Detach all event handlers
        detachEvents: function () {
            // Remove all namespaced events
            $(document).off('.pagodaTowers');
        },
        // Attach event handlers
        attachEvents: function () {
            const self = this;
            this.detachEvents();

            $(document).on('click.pagodaTowers', '[data-view]', function () {
                const view = $(this).data('view');
                $('.btn-group [data-view]').removeClass('active');
                $(this).addClass('active');
                self.currentView = view;
                if (view === 'towers') {
                    self.loadTowers();
                } else {
                    self.loadBlocks();
                }
            });

            $(document).on('click.pagodaTowers', '#btnRefresh', function () {
                if (self.currentView === 'towers') {
                    self.loadTowers();
                } else {
                    self.loadBlocks();
                }
            });

            $(document).on('click.pagodaTowers', '#btnAddTower, #btnAddTowerNoResults', function () {
                self.showTowerModal();
            });

            $(document).on('click.pagodaTowers', '#btnAddBlock, #btnAddBlockNoResults', function () {
                self.showBlockModal();
            });

            $(document).on('click.pagodaTowers', '.btn-edit-tower', function () {
                const id = $(this).data('id');
                self.editTower(id);
            });

            $(document).on('click.pagodaTowers', '.btn-delete-tower', function () {
                const id = $(this).data('id');
                self.deleteTower(id);
            });

            $(document).on('click.pagodaTowers', '.btn-view-blocks', function () {
                const towerId = $(this).data('id');
                $('#btnViewBlocks').click();
                self.loadBlocks(towerId);
            });

            $(document).on('click.pagodaTowers', '.btn-view-block', function () {
                const id = $(this).data('id');
                self.viewBlock(id);
            });

            $(document).on('click.pagodaTowers', '.btn-edit-block', function () {
                const id = $(this).data('id');
                self.editBlock(id);
            });

            $(document).on('click.pagodaTowers', '.btn-delete-block', function () {
                const id = $(this).data('id');
                self.deleteBlock(id);
            });
        },

        // Show tower modal
        showTowerModal: function (tower = null) {
            const self = this;
            const isEdit = !!tower;

            // First load categories (required)
            PagodaAPI.towerCategories.getActive()
                .done(function (response) {
                    console.log('Categories response:', response);
                    const categories = response && response.success && response.data ? response.data : [];
                    console.log('Parsed categories:', categories);
                    console.log('Categories length:', categories.length);

                    // Check if there are any active categories
                    if (categories.length === 0) {
                        Swal.fire({
                            title: 'No Categories Available',
                            text: 'Please create at least one active tower category before adding a tower.',
                            icon: 'warning',
                            confirmButtonText: 'Go to Categories',
                            showCancelButton: true,
                            cancelButtonText: 'Cancel'
                        }).then((result) => {
                            if (result.isConfirmed) {
                                window.location.hash = '#/pagoda/tower-categories';
                            }
                        });
                        return;
                    }

                    const categoryOptions = categories.map(cat =>
                        `<option value="${cat.id}" ${tower && tower.category_id === cat.id ? 'selected' : ''}>
                            ${cat.full_name}
                        </option>`
                    ).join('');

                    // Load deities (optional - don't block modal if this fails)
                    TempleAPI.get('/deities/active')
                        .done(function (deitiesResponse) {
                            console.log('Deities response:', deitiesResponse);
                            const deities = deitiesResponse && deitiesResponse.success && deitiesResponse.data ? deitiesResponse.data : [];
                            console.log('Parsed deities:', deities);

                            const deityOptions = deities.map(deity =>
                                `<option value="${deity.id}" ${tower && tower.deity_id === deity.id ? 'selected' : ''}>
                                    ${deity.name}${deity.name_secondary ? ' (' + deity.name_secondary + ')' : ''}
                                </option>`
                            ).join('');

                            self.renderTowerModal(tower, isEdit, categoryOptions, deityOptions);
                        })
                        .fail(function (xhr) {
                            console.warn('Failed to load deities, showing modal without deity options:', xhr);
                            // Show modal without deity options
                            self.renderTowerModal(tower, isEdit, categoryOptions, '');
                        });
                })
                .fail(function (xhr) {
                    console.error('Failed to load categories:', xhr);
                    TempleUtils.showError('Failed to load categories. Please try again.');
                });
        },

        // Renders the tower modal with provided options
        renderTowerModal: function (tower, isEdit, categoryOptions, deityOptions) {
            const self = this; // Ensure 'self' is available within this function
            const modalHtml = `
                        <div class="modal fade" id="towerModal" tabindex="-1">
                            <div class="modal-dialog">
                                <div class="modal-content">
                                    <div class="modal-header bg-primary text-white">
                                        <h5 class="modal-title">
                                            <i class="bi bi-building me-2"></i>
                                            ${isEdit ? 'Edit Tower' : 'Add New Tower'}
                                        </h5>
                                        <button type="button" class="btn-close btn-close-white" data-bs-dismiss="modal"></button>
                                    </div>
                                    <form id="towerForm">
                                        <div class="modal-body">
                                            <div class="row g-3">
                                                <div class="col-12">
                                                    <label class="form-label">Tower Name *</label>
                                                    <input type="text" class="form-control" name="tower_name" 
                                                           value="${tower ? tower.tower_name : ''}" required>
                                                </div>
                                                <div class="col-12">
                                                    <label class="form-label">Tower Code *</label>
                                                    <input type="text" class="form-control" name="tower_code" 
                                                           value="${tower ? tower.tower_code : ''}" 
                                                           placeholder="e.g., T1, T2" required>
                                                </div>
                                                <div class="col-12">
                                                    <label class="form-label">
                                                        <i class="bi bi-tags text-primary me-1"></i>
                                                        Tower Category *
                                                    </label>
                                                    <select class="form-select" name="category_id" required>
                                                        <option value="">-- Select Category --</option>
                                                        ${categoryOptions}
                                                    </select>
                                                    <small class="text-muted">Select a category for this tower</small>
                                                </div>
                                                <div class="col-12">
                                                    <label class="form-label">
                                                        <i class="bi bi-star text-warning me-1"></i>
                                                        Deity
                                                    </label>
                                                    <select class="form-select" name="deity_id">
                                                        <option value="">-- Select Deity (Optional) --</option>
                                                        ${deityOptions}
                                                    </select>
                                                    <small class="text-muted">Select a deity associated with this tower</small>
                                                </div>
                                                <div class="col-12">
                                                    <label class="form-label">Description</label>
                                                    <textarea class="form-control" name="description" rows="3">${tower ? (tower.description || '') : ''}</textarea>
                                                </div>
                                                <div class="col-12">
                                                    <div class="form-check form-switch">
                                                        <input class="form-check-input" type="checkbox" name="is_active"
                                                               id="towerActive"
                                                               ${!tower || tower.status === 'active' ? 'checked' : ''}>
                                                        <label class="form-check-label" for="towerActive">Active</label>
                                                    </div>
                                                </div>
                                            </div>
                                        </div>
                                        <div class="modal-footer">
                                            <button type="button" class="btn btn-secondary" data-bs-dismiss="modal">Cancel</button>
                                            <button type="submit" class="btn btn-primary">
                                                <i class="bi bi-check-circle"></i> ${isEdit ? 'Update' : 'Create'} Tower
                                            </button>
                                        </div>
                                    </form>
                                </div>
                            </div>
                        </div>
                    `;

            $('#towerModal').remove();
            $('body').append(modalHtml);
            const modal = new bootstrap.Modal(document.getElementById('towerModal'));
            modal.show();

            $('#towerForm').on('submit', function (e) {
                e.preventDefault();

                const formData = {
                    tower_name: $('input[name="tower_name"]').val(),
                    tower_code: $('input[name="tower_code"]').val(),
                    category_id: $('select[name="category_id"]').val(),
                    deity_id: $('select[name="deity_id"]').val() || null,
                    description: $('textarea[name="description"]').val(),
                    status: $('input[name="is_active"]').is(':checked') ? 'active' : 'inactive'
                };

                TempleUtils.showLoading(isEdit ? 'Updating tower...' : 'Creating tower...');

                const promise = isEdit ?
                    PagodaAPI.towers.update(tower.id, formData) :
                    PagodaAPI.towers.create(formData);

                promise
                    .done(function (response) {
                        if (response.success) {
                            TempleUtils.showSuccess(isEdit ? 'Tower updated successfully' : 'Tower created successfully');
                            modal.hide();
                            self.loadTowers();
                        }
                    })
                    .fail(function (xhr) {
                        TempleUtils.handleAjaxError(xhr, isEdit ? 'Failed to update tower' : 'Failed to create tower');
                    })
                    .always(function () {
                        TempleUtils.hideLoading();
                    });
            });

            $('#towerModal').on('hidden.bs.modal', function () {
                $(this).remove();
            });
        },

        // Fallback modal without categories (in case category loading fails)
        showTowerModalFallback: function (tower = null) {
            const self = this;
            const isEdit = !!tower;

            const modalHtml = `
                <div class="modal fade" id="towerModal" tabindex="-1">
                    <div class="modal-dialog">
                        <div class="modal-content">
                            <div class="modal-header bg-primary text-white">
                                <h5 class="modal-title">
                                    <i class="bi bi-building me-2"></i>
                                    ${isEdit ? 'Edit Tower' : 'Add New Tower'}
                                </h5>
                                <button type="button" class="btn-close btn-close-white" data-bs-dismiss="modal"></button>
                            </div>
                            <form id="towerForm">
                                <div class="modal-body">
                                    <div class="row g-3">
                                        <div class="col-12">
                                            <label class="form-label">Tower Name *</label>
                                            <input type="text" class="form-control" name="tower_name" 
                                                   value="${tower ? tower.tower_name : ''}" required>
                                        </div>
                                        <div class="col-12">
                                            <label class="form-label">Tower Code *</label>
                                            <input type="text" class="form-control" name="tower_code" 
                                                   value="${tower ? tower.tower_code : ''}" 
                                                   placeholder="e.g., T1, T2" required>
                                        </div>
                                        <div class="col-12">
                                            <label class="form-label">Description</label>
                                            <textarea class="form-control" name="description" rows="3">${tower ? (tower.description || '') : ''}</textarea>
                                        </div>
                                        <div class="col-12">
                                            <div class="form-check form-switch">
                                                <input class="form-check-input" type="checkbox" name="is_active"
                                                       id="towerActive"
                                                       ${!tower || tower.status === 'active' ? 'checked' : ''}>
                                                <label class="form-check-label" for="towerActive">Active</label>
                                            </div>
                                        </div>
                                    </div>
                                </div>
                                <div class="modal-footer">
                                    <button type="button" class="btn btn-secondary" data-bs-dismiss="modal">Cancel</button>
                                    <button type="submit" class="btn btn-primary">
                                        <i class="bi bi-check-circle"></i> ${isEdit ? 'Update' : 'Create'} Tower
                                    </button>
                                </div>
                            </form>
                        </div>
                    </div>
                </div>
            `;

            $('#towerModal').remove();
            $('body').append(modalHtml);
            const modal = new bootstrap.Modal(document.getElementById('towerModal'));
            modal.show();

            $('#towerForm').on('submit', function (e) {
                e.preventDefault();

                const formData = {
                    tower_name: $('input[name="tower_name"]').val(),
                    tower_code: $('input[name="tower_code"]').val(),
                    description: $('textarea[name="description"]').val(),
                    status: $('input[name="is_active"]').is(':checked') ? 'active' : 'inactive'
                };

                TempleUtils.showLoading(isEdit ? 'Updating tower...' : 'Creating tower...');

                const promise = isEdit ?
                    PagodaAPI.towers.update(tower.id, formData) :
                    PagodaAPI.towers.create(formData);

                promise
                    .done(function (response) {
                        if (response.success) {
                            TempleUtils.showSuccess(isEdit ? 'Tower updated successfully' : 'Tower created successfully');
                            modal.hide();
                            self.loadTowers();
                        }
                    })
                    .fail(function (xhr) {
                        TempleUtils.handleAjaxError(xhr, isEdit ? 'Failed to update tower' : 'Failed to create tower');
                    })
                    .always(function () {
                        TempleUtils.hideLoading();
                    });
            });

            $('#towerModal').on('hidden.bs.modal', function () {
                $(this).remove();
            });
        },

        // Edit tower
        editTower: function (id) {
            const self = this;

            TempleUtils.showLoading('Loading tower...');

            PagodaAPI.towers.getById(id)
                .done(function (response) {
                    if (response.success && response.data) {
                        // ✅ FIXED: Extract tower from nested response
                        const tower = response.data.tower || response.data;
                        console.log('Editing tower:', tower);
                        self.showTowerModal(tower);
                    }
                })
                .fail(function (xhr) {
                    TempleUtils.handleAjaxError(xhr, 'Failed to load tower');
                })
                .always(function () {
                    TempleUtils.hideLoading();
                });
        },

        // Delete tower
        deleteTower: function (id) {
            const self = this;

            Swal.fire({
                title: 'Delete Tower?',
                text: 'This will also delete all blocks and lights in this tower. This action cannot be undone!',
                icon: 'warning',
                showCancelButton: true,
                confirmButtonColor: '#dc3545',
                confirmButtonText: 'Yes, delete it',
                cancelButtonText: 'Cancel'
            }).then((result) => {
                if (result.isConfirmed) {
                    TempleUtils.showLoading('Deleting tower...');

                    PagodaAPI.towers.delete(id)
                        .done(function (response) {
                            if (response.success) {
                                TempleUtils.showSuccess('Tower deleted successfully');
                                self.loadTowers();
                            }
                        })
                        .fail(function (xhr) {
                            TempleUtils.handleAjaxError(xhr, 'Failed to delete tower');
                        })
                        .always(function () {
                            TempleUtils.hideLoading();
                        });
                }
            });
        },

        // Show block modal
        showBlockModal: function (block = null) {
            const self = this;
            const isEdit = !!block;

            // First load towers for dropdown
            PagodaAPI.towers.getAll()
                .done(function (response) {
                    const towers = Array.isArray(response.data) ? response.data : response.data.data || [];

                    console.log('Towers loaded for dropdown:', towers);

                    // ✅ FIXED: Filter by status property, not is_active
                    const activeTowers = towers.filter(t => t.status === 'active' || t.is_active);

                    console.log('Active towers:', activeTowers);

                    if (activeTowers.length === 0) {
                        TempleUtils.showWarning('No active towers found. Please create a tower first.');
                        return;
                    }

                    const towerOptions = activeTowers.map(t =>
                        `<option value="${t.id}" ${block && block.tower_id === t.id ? 'selected' : ''}>
                    ${t.tower_name} (${t.tower_code})
                </option>`
                    ).join('');

                    const modalHtml = `
                <div class="modal fade" id="blockModal" tabindex="-1">
                    <div class="modal-dialog modal-dialog-centered modal-dialog-scrollable"> <!-- ✅ Made scrollable -->
                        <div class="modal-content" style="max-height: 90vh;"> <!-- ✅ Added max height -->
                            <div class="modal-header bg-primary text-white">
                                <h5 class="modal-title">
                                    <i class="bi bi-grid-3x3 me-2"></i>
                                    ${isEdit ? 'Edit Block' : 'Add New Block'}
                                </h5>
                                <button type="button" class="btn-close btn-close-white" data-bs-dismiss="modal"></button>
                            </div>
                            <form id="blockForm">
                                <div class="modal-body" style="max-height: 70vh; overflow-y: auto;"> <!-- ✅ Scrollable body -->
                                    <div class="row g-3">
                                        <!-- Tower Selection (FIRST AND VISIBLE) -->
                                        <div class="col-12">
                                            <label class="form-label fw-bold">
                                                <i class="bi bi-building text-primary me-1"></i>
                                                Tower * <span class="text-danger">(Required)</span>
                                            </label>
                                            <select class="form-select form-select-lg" name="tower_id" required>
                                                <option value="">-- Select Tower --</option>
                                                ${towerOptions}
                                            </select>
                                            <small class="text-muted">Select the tower this block belongs to</small>
                                        </div>

                                        <!-- Block Name -->
                                        <div class="col-12">
                                            <label class="form-label">Block Name *</label>
                                            <input type="text" class="form-control" name="block_name" 
                                                   value="${block ? block.block_name : ''}" 
                                                   placeholder="e.g., Block A" required>
                                        </div>

                                        <!-- Block Code -->
                                        <div class="col-12">
                                            <label class="form-label">Block Code *</label>
                                            <input type="text" class="form-control" name="block_code" 
                                                   value="${block ? block.block_code : ''}" 
                                                   placeholder="e.g., A, B, C, B1, B2" required>
                                        </div>

                                        <!-- Floors and Lights per Floor -->
                                        <div class="col-6">
                                            <label class="form-label">Total Floors *</label>
                                            <input type="number" class="form-control" name="total_floors" 
                                                   value="${block ? block.total_floors : '70'}" 
                                                   min="1" max="200" required>
                                        </div>
                                        <div class="col-6">
                                            <label class="form-label">Lights per Floor *</label>
                                            <input type="number" class="form-control" name="rags_per_floor" 
                                                   value="${block ? (block.rags_per_floor) : '100'}" 
                                                   min="1" max="500" required>
                                        </div>

                                        <!-- Description -->
                                        <div class="col-12">
                                            <label class="form-label">Description</label>
                                            <textarea class="form-control" name="description" rows="2" 
                                                      placeholder="Optional description...">${block ? (block.description || '') : ''}</textarea>
                                        </div>

                                        <!-- Auto-generate lights -->
                                        <div class="col-12">
                                            <div class="form-check form-switch">
                                                <input class="form-check-input" type="checkbox" name="auto_generate_lights" 
                                                       id="autoGenerateLights" ${!isEdit ? 'checked' : ''}>
                                                <label class="form-check-label" for="autoGenerateLights">
                                                    Auto-generate lights (Creates all light slots automatically)
                                                </label>
                                            </div>
                                        </div>

                                        <!-- Active status -->
                                        <div class="col-12">
                                            <div class="form-check form-switch">
                                                <input class="form-check-input" type="checkbox" name="is_active" 
                                                       id="blockActive" ${!block || block.status === 'active' || block.is_active ? 'checked' : ''}>
                                                <label class="form-check-label" for="blockActive">Active</label>
                                            </div>
                                        </div>
                                    </div>
                                </div>
                                <div class="modal-footer">
                                    <button type="button" class="btn btn-secondary" data-bs-dismiss="modal">Cancel</button>
                                    <button type="submit" class="btn btn-primary">
                                        <i class="bi bi-check-circle"></i> ${isEdit ? 'Update' : 'Create'} Block
                                    </button>
                                </div>
                            </form>
                        </div>
                    </div>
                </div>
            `;

                    // Remove any existing modals
                    $('#blockModal').remove();
                    $('.modal-backdrop').remove();

                    $('body').append(modalHtml);
                    const modal = new bootstrap.Modal(document.getElementById('blockModal'));
                    modal.show();

                    // Log dropdown content for debugging
                    console.log('Tower dropdown options count:', $('#blockModal select[name="tower_id"] option').length);

                    // Form submit handler
                    $('#blockForm').one('submit', function (e) {
                        e.preventDefault();

                        const formData = {
                            tower_id: $('select[name="tower_id"]').val(),
                            block_name: $('input[name="block_name"]').val(),
                            block_code: $('input[name="block_code"]').val(),
                            total_floors: parseInt($('input[name="total_floors"]').val()),
                            rags_per_floor: parseInt($('input[name="rags_per_floor"]').val()),
                            description: $('textarea[name="description"]').val(),
                            auto_generate_lights: $('input[name="auto_generate_lights"]').is(':checked'),
                            is_active: $('input[name="is_active"]').is(':checked')
                        };

                        console.log('Submitting block data:', formData);
		
                        if (!formData.tower_id) {
                            TempleUtils.showWarning('Please select a tower');
                            return;
                        }

                        TempleUtils.showLoading(isEdit ? 'Updating block...' : 'Creating block...');

                        const promise = isEdit ?
                            PagodaAPI.blocks.update(block.id, formData) :
                            PagodaAPI.blocks.create(formData);

                        promise
                            .done(function (response) {
                                if (response.success) {
                                    TempleUtils.showSuccess(isEdit ? 'Block updated successfully' : 'Block created successfully');
                                    modal.hide();
                                    self.loadBlocks();
                                }
                            })
                            .fail(function (xhr) {
                                TempleUtils.handleAjaxError(xhr, isEdit ? 'Failed to update block' : 'Failed to create block');
                            })
                            .always(function () {
                                TempleUtils.hideLoading();
                            });
                    });

                    // Cleanup
                    $('#blockModal').one('hidden.bs.modal', function () {
                        $(this).remove();
                        $('.modal-backdrop').remove();
                    });
                })
                .fail(function (xhr) {
                    TempleUtils.handleAjaxError(xhr, 'Failed to load towers');
                });
        },
        // View block details
        viewBlock: function (id) {
            TempleRouter.navigate('pagoda/lights', { block_id: id });
        },

        // Edit block
        editBlock: function (id) {
            const self = this;

            TempleUtils.showLoading('Loading block...');

            PagodaAPI.blocks.getById(id)
                .done(function (response) {
                    if (response.success && response.data) {
                        self.showBlockModal(response.data);
                    }
                })
                .fail(function (xhr) {
                    TempleUtils.handleAjaxError(xhr, 'Failed to load block');
                })
                .always(function () {
                    TempleUtils.hideLoading();
                });
        },

        // Delete block
        deleteBlock: function (id) {
            const self = this;

            Swal.fire({
                title: 'Delete Block?',
                text: 'This will also delete all lights in this block. This action cannot be undone!',
                icon: 'warning',
                showCancelButton: true,
                confirmButtonColor: '#dc3545',
                confirmButtonText: 'Yes, delete it',
                cancelButtonText: 'Cancel'
            }).then((result) => {
                if (result.isConfirmed) {
                    TempleUtils.showLoading('Deleting block...');

                    PagodaAPI.blocks.delete(id)
                        .done(function (response) {
                            if (response.success) {
                                TempleUtils.showSuccess('Block deleted successfully');
                                self.loadBlocks();
                            }
                        })
                        .fail(function (xhr) {
                            TempleUtils.handleAjaxError(xhr, 'Failed to delete block');
                        })
                        .always(function () {
                            TempleUtils.hideLoading();
                        });
                }
            });
        },

        destroy: function () {
            this.detachEvents();
            $('#towerModal').remove();
            $('#blockModal').remove();
            $('.modal-backdrop').remove();
            $('body').removeClass('modal-open').css('overflow', '');
            console.log('Pagoda Towers page destroyed');
        }

    };

})(jQuery, window);