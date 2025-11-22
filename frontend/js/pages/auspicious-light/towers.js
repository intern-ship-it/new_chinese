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

        // Render page structure
        render: function () {
            const html = `
                <div class="towers-management-container">
                    
                    <!-- Page Header -->
                    <div class="page-header mb-4" data-aos="fade-down">
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

                    <!-- View Toggle -->
                    <div class="btn-group mb-4" role="group" data-aos="fade-up">
                        <button type="button" class="btn btn-outline-primary active" data-view="towers" id="btnViewTowers">
                            <i class="bi bi-building"></i> Towers
                        </button>
                        <button type="button" class="btn btn-outline-primary" data-view="blocks" id="btnViewBlocks">
                            <i class="bi bi-grid-3x3"></i> Blocks
                        </button>
                    </div>

                    <!-- Content Container -->
                    <div id="contentContainer"></div>

                </div>
            `;

            $('#page-container').html(html);

            // Initialize AOS
            if (typeof AOS !== 'undefined') {
                AOS.refresh();
            }
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
                <div class="col-md-6 col-lg-4" data-aos="fade-up">
                    <div class="card tower-card h-100">
                        <div class="card-header bg-primary text-white">
                            <div class="d-flex justify-content-between align-items-center">
                                <h5 class="mb-0">${tower.tower_name}</h5>
                                <div class="btn-group btn-group-sm">
                                    <button class="btn btn-sm btn-light btn-edit-tower" data-id="${tower.id}" title="Edit">
                                        <i class="bi bi-pencil"></i>
                                    </button>
                                    <button class="btn btn-sm btn-danger btn-delete-tower" data-id="${tower.id}" title="Delete">
                                        <i class="bi bi-trash"></i>
                                    </button>
                                </div>
                            </div>
                        </div>
                        <div class="card-body">
                            <div class="mb-3">
                                <span class="badge bg-secondary">Code: ${tower.tower_code}</span>
                            </div>
                            
                            <div class="row g-2 mb-3">
                                <div class="col-6">
                                    <div class="stat-box text-center p-2 border rounded">
                                        <h4 class="mb-0">${tower.total_blocks || 0}</h4>
                                        <small class="text-muted">Blocks</small>
                                    </div>
                                </div>
                                <div class="col-6">
                                    <div class="stat-box text-center p-2 border rounded">
                                        <h4 class="mb-0">${tower.total_lights || 0}</h4>
                                        <small class="text-muted">Lights</small>
                                    </div>
                                </div>
                            </div>

                            ${tower.description ? `
                                <p class="text-muted small mb-3">${tower.description}</p>
                            ` : ''}

                            <div class="d-flex justify-content-between align-items-center">
                            <span class="badge ${tower.status === 'active' ? 'bg-success' : 'bg-secondary'}">
    ${tower.status === 'active' ? 'Active' : 'Inactive'}
</span>
                                <button class="btn btn-sm btn-outline-primary btn-view-blocks" data-id="${tower.id}">
                                    <i class="bi bi-grid-3x3"></i> View Blocks
                                </button>
                            </div>
                        </div>
                    </div>
                </div>
            `).join('');

            const html = `
                <div class="row g-4">
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

        // Render blocks view
        renderBlocks: function (blocks) {
            if (!blocks || blocks.length === 0) {
                this.showNoResults('blocks');
                return;
            }

            const tableRows = blocks.map(block => `
    <tr>
        <td><strong>${block.block_name}</strong></td>
        <td><code>${block.block_code}</code></td>
        <td><strong>${block.tower_name || block.tower?.tower_name || '-'}</strong></td>
        <td class="text-center">${block.total_floors || 0}</td>
        <td class="text-center">${block.rags_per_floor || block.lights_per_floor || 0}</td>
        <td class="text-center"><strong>${block.total_capacity || block.total_lights || 0}</strong></td>
        <td>
            <span class="badge ${block.status === 'active' ? 'bg-success' : 'bg-secondary'}">
                ${block.status === 'active' ? 'Active' : 'Inactive'}
            </span>
        </td>
        <td>
            <div class="btn-group btn-group-sm">
                <button class="btn btn-outline-primary btn-view-block" data-id="${block.id}" title="View">
                    <i class="bi bi-eye"></i>
                </button>
                <button class="btn btn-outline-secondary btn-edit-block" data-id="${block.id}" title="Edit">
                    <i class="bi bi-pencil"></i>
                </button>
                <button class="btn btn-outline-danger btn-delete-block" data-id="${block.id}" title="Delete">
                    <i class="bi bi-trash"></i>
                </button>
            </div>
        </td>
    </tr>
`).join('');

            const html = `
                <div class="card" data-aos="fade-up">
                    <div class="card-header d-flex justify-content-between align-items-center">
                        <h5 class="mb-0">
                            <i class="bi bi-grid-3x3 me-2"></i>
                            All Blocks
                        </h5>
                        <button class="btn btn-sm btn-success" id="btnAddBlock">
                            <i class="bi bi-plus-circle"></i> Add Block
                        </button>
                    </div>
                    <div class="card-body p-0">
                        <div class="table-responsive">
                            <table class="table table-hover mb-0">
                                <thead class="table-light">
                                    <tr>
                                        <th>Block Name</th>
                                        <th>Code</th>
                                        <th>Tower</th>
                                        <th>Floors</th>
                                        <th>Lights/Floor</th>
                                        <th>Total Lights</th>
                                        <th>Status</th>
                                        <th>Actions</th>
                                    </tr>
                                </thead>
                                <tbody>
                                    ${tableRows}
                                </tbody>
                            </table>
                        </div>
                    </div>
                </div>
            `;

            $('#contentContainer').html(html);
        },

        // Show no results
        showNoResults: function (type) {
            const message = type === 'towers' ? 'No towers found' : 'No blocks found';
            const addButton = type === 'towers' ?
                '<button class="btn btn-primary" id="btnAddTowerNoResults"><i class="bi bi-plus-circle"></i> Add First Tower</button>' :
                '<button class="btn btn-primary" id="btnAddBlockNoResults"><i class="bi bi-plus-circle"></i> Add First Block</button>';

            $('#contentContainer').html(`
                <div class="text-center py-5">
                    <i class="bi bi-inbox display-4 text-muted d-block mb-3"></i>
                    <p class="text-muted mb-3">${message}</p>
                    ${addButton}
                </div>
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

            // ✅ IMPORTANT: Remove old event handlers first to prevent duplicates
            this.detachEvents();

            // View toggle - Use namespaced events
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

            // Refresh
            $(document).on('click.pagodaTowers', '#btnRefresh', function () {
                if (self.currentView === 'towers') {
                    self.loadTowers();
                } else {
                    self.loadBlocks();
                }
            });

            // Add tower
            $(document).on('click.pagodaTowers', '#btnAddTower, #btnAddTowerNoResults', function () {
                self.showTowerModal();
            });

            // Add block
            $(document).on('click.pagodaTowers', '#btnAddBlock, #btnAddBlockNoResults', function () {
                self.showBlockModal();
            });

            // Edit tower
            $(document).on('click.pagodaTowers', '.btn-edit-tower', function () {
                const id = $(this).data('id');
                self.editTower(id);
            });

            // Delete tower
            $(document).on('click.pagodaTowers', '.btn-delete-tower', function () {
                const id = $(this).data('id');
                self.deleteTower(id);
            });

            // View blocks for tower
            $(document).on('click.pagodaTowers', '.btn-view-blocks', function () {
                const towerId = $(this).data('id');
                $('#btnViewBlocks').click();
                self.loadBlocks(towerId);
            });

            // View block
            $(document).on('click.pagodaTowers', '.btn-view-block', function () {
                const id = $(this).data('id');
                self.viewBlock(id);
            });

            // Edit block
            $(document).on('click.pagodaTowers', '.btn-edit-block', function () {
                const id = $(this).data('id');
                self.editBlock(id);
            });

            // Delete block
            $(document).on('click.pagodaTowers', '.btn-delete-block', function () {
                const id = $(this).data('id');
                self.deleteBlock(id);
            });
        },

        // Show tower modal
        showTowerModal: function (tower = null) {
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
                                            <input type="number" class="form-control" name="lights_per_floor" 
                                                   value="${block ? (block.rags_per_floor || block.lights_per_floor) : '100'}" 
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
                            tower_id: parseInt($('select[name="tower_id"]').val()),
                            block_name: $('input[name="block_name"]').val(),
                            block_code: $('input[name="block_code"]').val(),
                            total_floors: parseInt($('input[name="total_floors"]').val()),
                            lights_per_floor: parseInt($('input[name="lights_per_floor"]').val()),
                            description: $('textarea[name="description"]').val(),
                            auto_generate_lights: $('input[name="auto_generate_lights"]').is(':checked'),
                            is_active: $('input[name="is_active"]').is(':checked')
                        };

                        console.log('Submitting block data:', formData);

                        if (!formData.tower_id || isNaN(formData.tower_id)) {
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
            // Remove all event handlers
            this.detachEvents();

            // Remove any open modals
            $('#towerModal').remove();
            $('#blockModal').remove();

            console.log('Pagoda Towers page destroyed');
        }

    };

})(jQuery, window);