// js/pages/special-occasions/services.js
// Occasion Services Master Management Module - Donations UI Style

(function ($, window) {
    'use strict';

    // Shared module for CSS management
    if (!window.OccasionServicesSharedModule) {
        window.OccasionServicesSharedModule = {
            moduleId: 'occasion-services',
            eventNamespace: 'occasionServices',
            cssId: 'occasion-services-css',
            cssPath: '/css/occasion-services.css',
            activePages: new Set(),
            
            loadCSS: function() {
                if (!document.getElementById(this.cssId)) {
                    const link = document.createElement('link');
                    link.id = this.cssId;
                    link.rel = 'stylesheet';
                    link.href = this.cssPath;
                    document.head.appendChild(link);
                    console.log('Occasion Services CSS loaded');
                }
            },
            
            registerPage: function(pageId) {
                this.activePages.add(pageId);
                this.loadCSS();
                console.log(`Occasion Services page registered: ${pageId}`);
            },
            
            unregisterPage: function(pageId) {
                this.activePages.delete(pageId);
                console.log(`Occasion Services page unregistered: ${pageId}`);
                
                if (this.activePages.size === 0) {
                    this.cleanup();
                }
            },
            
            cleanup: function() {
                const cssLink = document.getElementById(this.cssId);
                if (cssLink) {
                    cssLink.remove();
                    console.log('Occasion Services CSS removed');
                }
                
                if (typeof gsap !== 'undefined') {
                    gsap.killTweensOf("*");
                }
                
                $(document).off('.' + this.eventNamespace);
                $(window).off('.' + this.eventNamespace);
                
                this.activePages.clear();
                console.log('Occasion Services module cleaned up');
            }
        };
    }

    window.SpecialOccasionsServicesPage = {
        currentUser: null,
        services: [],
        serviceTypes: [],
        ledgers: [],
        selectedService: null,
        editMode: false,
        modal: null,
        pageId: 'services-master',

        // ========================================
        // INITIALIZATION
        // ========================================
        init: function (params) {
            window.OccasionServicesSharedModule.registerPage(this.pageId);
            this.currentUser = JSON.parse(localStorage.getItem(window.APP_CONFIG.STORAGE.USER) || '{}');
            this.render();
            this.initAnimations();
            this.bindEvents();
            this.loadLookups().then(() => {
                this.loadServices();
            });
        },

        cleanup: function () {
            console.log('Cleaning up Services page...');
            window.OccasionServicesSharedModule.unregisterPage(this.pageId);
            
            $(document).off('.occasionServices');
            if (this.modal) {
                this.modal.dispose();
                this.modal = null;
            }
            this.services = [];
            this.serviceTypes = [];
            this.ledgers = [];
            this.selectedService = null;
            this.editMode = false;
        },

        // ========================================
        // RENDER MAIN PAGE - DONATIONS STYLE
        // ========================================
        render: function () {
            const html = `
                <div class="services-page">
                    <!-- Hero Header Banner - Donations Style -->
                    <div class="services-header">
                        <div class="services-header-bg"></div>
                        <div class="container-fluid">
                            <div class="d-flex justify-content-between align-items-center">
                                <div class="services-title-wrapper">
                                    <div class="services-header-icon">
                                        <i class="bi bi-gear-fill"></i>
                                    </div>
                                    <div>
                                        <h1 class="services-title">Temple Event Services</h1>
                                        <p class="services-subtitle">服务管理 • Service Management</p>
                                    </div>
                                </div>
                                <button class="btn btn-outline-light" id="btnAddService">
                                    <i class="bi bi-plus-circle me-2"></i>Add New Service 添加服务
                                </button>
                            </div>
                        </div>
                    </div>

                    <!-- Breadcrumb -->
                    <nav aria-label="breadcrumb" class="mb-3">
                        <ol class="breadcrumb mb-0">
                            <li class="breadcrumb-item"><a href="#/dashboard">Dashboard</a></li>
                            <li class="breadcrumb-item"><a href="#/special-occasions/master">Special Occasions</a></li>
                            <li class="breadcrumb-item active">Services 服务</li>
                        </ol>
                    </nav>

                    <!-- Filters Section -->
                    <div class="card filter-card shadow-sm mb-4">
                        <div class="card-body py-3">
                            <div class="row g-3 align-items-end">
                                <div class="col-md-2">
                                    <label class="form-label small text-muted fw-semibold">Status 状态</label>
                                    <select class="form-select" id="filterStatus">
                                        <option value="">All Status 全部状态</option>
                                        <option value="active">Active 启用</option>
                                        <option value="inactive">Inactive 停用</option>
                                    </select>
                                </div>
                                <div class="col-md-2">
                                    <label class="form-label small text-muted fw-semibold">Addon 附加</label>
                                    <select class="form-select" id="filterAddon">
                                        <option value="">All 全部</option>
                                        <option value="1">Yes 是</option>
                                        <option value="0">No 否</option>
                                    </select>
                                </div>
                                <div class="col-md-5">
                                    <label class="form-label small text-muted fw-semibold">Search 搜索</label>
                                    <input type="text" class="form-control" id="searchInput" placeholder="Search by service name 按服务名称搜索...">
                                </div>
                                <div class="col-md-3 d-flex gap-2">
                                    <button class="btn btn-primary flex-fill" id="btnFilter">
                                        <i class="bi bi-funnel me-1"></i> Filter 过滤
                                    </button>
                                    <button class="btn btn-outline-secondary flex-fill" id="btnResetFilters">
                                        <i class="bi bi-arrow-clockwise me-1"></i> Reset 重置
                                    </button>
                                </div>
                            </div>
                        </div>
                    </div>

                    <!-- Services List -->
                    <div class="card table-card shadow-sm">
                        
                        <div class="card-body p-0">
                            <div class="table-responsive">
                                <table class="table table-hover mb-0" id="servicesTable">
                                    <thead>
                                        <tr>
                                            <th width="5%">#</th>
                                            <th width="25%">Service Name 服务名称</th>
                                            <th width="10%" class="text-center">Addon 附加</th>
                                            <th width="12%" class="text-end">Amount 金额 (RM)</th>
                                            <th width="15%">Ledger 账簿</th>
                                            <th width="10%" class="text-center">Status 状态</th>
                                            <th width="23%">Actions 操作</th>
                                        </tr>
                                    </thead>
                                    <tbody id="servicesTableBody">
                                        <tr>
                                            <td colspan="7" class="text-center py-4">
                                                <div class="spinner-border spinner-border-sm text-primary me-2"></div>
                                                Loading 加载中...
                                            </td>
                                        </tr>
                                    </tbody>
                                </table>
                            </div>
                        </div>
                    </div>
                </div>

                ${this.renderModal()}
            `;

            $('#page-container').html(html);
        },

        // ========================================
        // RENDER MODAL - DONATIONS STYLE
        // ========================================
        renderModal: function () {
            return `
                <div class="modal fade" id="serviceModal" tabindex="-1" data-bs-backdrop="static">
                    <div class="modal-dialog modal-lg modal-dialog-centered">
                        <div class="modal-content border-0 shadow-lg">
                            <div class="modal-header border-bottom" style="background: linear-gradient(135deg, var(--primary-color) 0%, var(--secondary-color) 100%);">
                                <h5 class="modal-title text-white" id="modalTitle">
                                    <i class="bi bi-plus-circle me-2"></i>Add New Service 添加服务
                                </h5>
                                <button type="button" class="btn-close btn-close-white" data-bs-dismiss="modal"></button>
                            </div>
                            <div class="modal-body p-4">
                                <form id="serviceForm">
                                    <input type="hidden" id="serviceId">
                                    
                                    <!-- Service Details Section -->
                                    <div class="section-header-gradient mb-3">
                                        <i class="bi bi-info-circle"></i>
                                        <span>Service Details 服务详情</span>
                                    </div>

                                    <div class="row">
                                        <!-- Name (Required) -->
                                        <div class="col-md-6 mb-3">
                                            <label class="form-label fw-semibold">Name 名称 <span class="text-danger">*</span></label>
                                            <input type="text" class="form-control" id="serviceName" required placeholder="Enter name 输入名称">
                                            <div class="invalid-feedback">Please enter the name 请输入名称</div>
                                        </div>

                                        <!-- Secondary Name (Optional) -->
                                        <div class="col-md-6 mb-3">
                                            <label class="form-label fw-semibold">Name(Secondary) 副名称</label>
                                            <input type="text" class="form-control" id="serviceNameSecondary" placeholder="Enter name (Secondary) 输入副名称（可选）">
                                        </div>
                                    </div>

                                    <div class="row">
                                        <!-- Status (Required) -->
                                        <div class="col-md-12 mb-3">
                                            <label class="form-label fw-semibold">Status 状态 <span class="text-danger">*</span></label>
                                            <select class="form-select" id="serviceStatus" required>
                                                <option value="">-- Select Status 选择状态 --</option>
                                                <option value="active">Active 启用</option>
                                                <option value="inactive">Inactive 停用</option>
                                            </select>
                                            <div class="invalid-feedback">Please select a status 请选择状态</div>
                                        </div>
                                    </div>

                                    <!-- Addon Section -->
                                    <div class="section-header-gradient mb-3 mt-4">
                                        <i class="bi bi-puzzle"></i>
                                        <span>Addon Configuration 附加配置</span>
                                    </div>

                                    <div class="card bg-light border mb-3">
                                        <div class="card-body py-3">
                                            <div class="row">
                                                <!-- Addon Checkbox -->
                                                <div class="col-12 mb-3">
                                                    <div class="form-check">
                                                        <input class="form-check-input" type="checkbox" id="isAddon">
                                                        <label class="form-check-label fw-semibold" for="isAddon">
                                                            <i class="bi bi-puzzle-fill me-1"></i>
                                                            Mark as Addon Service 标记为附加服务
                                                        </label>
                                                    </div>
                                                    <small class="text-muted d-block mt-2 ms-4">
                                                        <i class="bi bi-info-circle me-1"></i>
                                                        If checked, amount and ledger are required 如果选中，金额和账簿为必填项
                                                    </small>
                                                </div>

                                                <!-- Amount -->
                                                <div class="col-md-6 mb-2">
                                                    <label class="form-label fw-semibold" id="amountLabel">Amount 金额</label>
                                                    <div class="input-group">
                                                        <span class="input-group-text">RM</span>
                                                        <input type="number" class="form-control" id="serviceAmount" 
                                                               step="0.01" min="0" value="0.00" placeholder="0.00">
                                                    </div>
                                                    <div class="invalid-feedback">Amount is required when addon is checked 选中附加服务时金额为必填项</div>
                                                </div>

                                                <!-- Ledger -->
                                                <div class="col-md-6 mb-2">
                                                    <label class="form-label fw-semibold" id="ledgerLabel">Ledger 账簿</label>
                                                    <select class="form-select" id="ledgerId">
                                                        <option value="">-- Select Ledger 选择账簿 --</option>
                                                    </select>
                                                    <div class="invalid-feedback">Ledger is required when addon is checked 选中附加服务时账簿为必填项</div>
                                                </div>
                                            </div>
                                        </div>
                                    </div>

                                </form>
                            </div>
                            <div class="modal-footer border-top bg-light">
                                <button type="button" class="btn btn-secondary" data-bs-dismiss="modal">
                                    <i class="bi bi-x-circle me-1"></i> Cancel 取消
                                </button>
                                <button type="button" class="btn btn-success" id="btnSaveService">
                                    <i class="bi bi-check-circle me-1"></i> Save 保存
                                </button>
                            </div>
                        </div>
                    </div>
                </div>
            `;
        },

        // ========================================
        // INIT ANIMATIONS
        // ========================================
        initAnimations: function() {
            // Add hover animations to cards
            $('.filter-card, .table-card').each(function() {
                $(this).hover(
                    function() {
                        $(this).css('box-shadow', '0 8px 20px rgba(0,0,0,0.1)');
                    },
                    function() {
                        $(this).css('box-shadow', '0 2px 8px rgba(0,0,0,0.08)');
                    }
                );
            });
        },

        // ========================================
        // EVENT BINDINGS
        // ========================================
        bindEvents: function () {
            const self = this;

            // Add Service
            $(document).on('click.occasionServices', '#btnAddService', function () {
                self.openModal('add');
            });

            // Save Service
            $(document).on('click.occasionServices', '#btnSaveService', function () {
                self.saveService();
            });

            // Edit Service
            $(document).on('click.occasionServices', '.btn-edit', function () {
                const id = $(this).data('id');
                self.editService(id);
            });

            // Delete Service
            $(document).on('click.occasionServices', '.btn-delete', function () {
                const id = $(this).data('id');
                self.deleteService(id);
            });

            // Toggle Status
            $(document).on('click.occasionServices', '.btn-toggle-status', function () {
                const id = $(this).data('id');
                const status = $(this).data('status');
                self.toggleStatus(id, status);
            });

            // Addon checkbox change - toggle amount and ledger required
            $(document).on('change.occasionServices', '#isAddon', function () {
                self.toggleAddonRequirements($(this).is(':checked'));
            });

            // Filters
            $(document).on('change.occasionServices', '#filterStatus, #filterAddon', function () {
                self.loadServices();
            });
            $(document).on('click.occasionServices', '#btnFilter', function () {
                self.loadServices();
            });
            $(document).on('keyup.occasionServices', '#searchInput', function () {
                clearTimeout(self.searchTimeout);
                self.searchTimeout = setTimeout(() => self.loadServices(), 500);
            });
            $(document).on('click.occasionServices', '#btnResetFilters', function () {
                $('#filterStatus').val('');
                $('#filterAddon').val('');
                $('#searchInput').val('');
                self.loadServices();
            });

            // Modal cleanup
            $(document).on('hidden.bs.modal.occasionServices', '#serviceModal', function () {
                self.resetForm();
            });
        },

        // ========================================
        // TOGGLE ADDON REQUIREMENTS
        // ========================================
        toggleAddonRequirements: function (isRequired) {
            const $amountLabel = $('#amountLabel');
            const $amountInput = $('#serviceAmount');
            const $ledgerLabel = $('#ledgerLabel');
            const $ledgerSelect = $('#ledgerId');

            if (isRequired) {
                // Make both amount and ledger required
                $amountLabel.html('Amount 金额 <span class="text-danger">*</span>');
                $amountInput.attr('required', true);
                $ledgerLabel.html('Ledger 账簿 <span class="text-danger">*</span>');
                $ledgerSelect.attr('required', true);
            } else {
                // Make both optional
                $amountLabel.html('Amount 金额');
                $amountInput.removeAttr('required');
                $ledgerLabel.html('Ledger 账簿');
                $ledgerSelect.removeAttr('required');
            }
        },

        // ========================================
        // LOAD LOOKUPS (Service Types & Ledgers)
        // ========================================
        loadLookups: function () {
            const self = this;
            return new Promise((resolve, reject) => {
                TempleAPI.get('/occasion-services-master/lookups', {})
                    .done(function (response) {
                        if (response.success) {
                            self.serviceTypes = response.data.service_types || [];
                            self.ledgers = response.data.ledgers || [];
                            self.populateDropdowns();
                        }
                        resolve();
                    })
                    .fail(function (xhr) {
                        console.error('Failed to load lookups:', xhr);
                        resolve(); // Continue even if lookups fail
                    });
            });
        },

        // ========================================
        // POPULATE DROPDOWNS
        // ========================================
        populateDropdowns: function () {
            // Ledger dropdown
            const $ledgerId = $('#ledgerId');
            $ledgerId.find('option:not(:first)').remove();
            this.ledgers.forEach(ledger => {
                const displayName = ledger.code ? `${ledger.code} - ${ledger.name}` : ledger.name;
                $ledgerId.append(`<option value="${ledger.id}">${displayName}</option>`);
            });
        },

        // ========================================
        // DATA LOADING
        // ========================================
        loadServices: function () {
            const self = this;
            const params = {
                status: $('#filterStatus').val(),
                is_addon: $('#filterAddon').val(),
                search: $('#searchInput').val()
            };

            // Remove empty params
            Object.keys(params).forEach(key => {
                if (params[key] === '' || params[key] === null || params[key] === undefined) {
                    delete params[key];
                }
            });

            TempleAPI.get('/occasion-services-master', params)
                .done(function (response) {
                    if (response.success) {
                        self.services = response.data || [];
                        self.renderTable();
                        $('#serviceCount').text(self.services.length);
                    }
                })
                .fail(function (xhr) {
                    console.error('Failed to load services:', xhr);
                    $('#servicesTableBody').html(`
                        <tr>
                            <td colspan="7" class="text-center py-4 text-danger">
                                <i class="bi bi-exclamation-circle me-2"></i>Failed to load data 加载数据失败
                            </td>
                        </tr>
                    `);
                });
        },

        renderTable: function () {
            if (!this.services || this.services.length === 0) {
                $('#servicesTableBody').html(`
                    <tr>
                        <td colspan="7" class="text-center py-5">
                            <i class="bi bi-inbox fs-1 text-muted d-block mb-2"></i>
                            <span class="text-muted">No services found 未找到服务</span>
                        </td>
                    </tr>
                `);
                return;
            }

            let html = '';
            this.services.forEach((service, index) => {
                const statusBadge = service.status === 'active' 
                    ? '<span class="badge bg-success">Active 启用</span>'
                    : '<span class="badge bg-secondary">Inactive 停用</span>';
                
                const addonBadge = service.is_addon 
                    ? '<span class="badge bg-info">Yes 是</span>'
                    : '<span class="badge bg-light text-dark">No 否</span>';

                const amount = service.is_addon ? `RM ${parseFloat(service.amount).toFixed(2)}` : '-';
                const ledgerName = service.ledger?.name || '-';

                const toggleIcon = service.status === 'active' ? 'bi-toggle-on text-success' : 'bi-toggle-off text-secondary';
                const toggleTitle = service.status === 'active' ? 'Set Inactive 设为停用' : 'Set Active 设为启用';

                const displayName = service.name_secondary 
                    ? `${this.escapeHtml(service.name)} <small class="text-muted">(${this.escapeHtml(service.name_secondary)})</small>`
                    : this.escapeHtml(service.name);

                html += `
                    <tr>
                        <td>${index + 1}</td>
                        <td>${displayName}</td>
                        <td class="text-center">${addonBadge}</td>
                        <td class="text-end">${amount}</td>
                        <td><small>${this.escapeHtml(ledgerName)}</small></td>
                        <td class="text-center">${statusBadge}</td>
                        <td>
                            <div class="btn-group btn-group-sm">
                                <button class="btn btn-outline-primary btn-edit" data-id="${service.id}" title="Edit 编辑">
                                    <i class="bi bi-pencil"></i>
                                </button>
                                <button class="btn btn-outline-secondary btn-toggle-status" data-id="${service.id}" data-status="${service.status}" title="${toggleTitle}">
                                    <i class="bi ${toggleIcon}"></i>
                                </button>
                                <button class="btn btn-outline-danger btn-delete" data-id="${service.id}" title="Delete 删除">
                                    <i class="bi bi-trash"></i>
                                </button>
                            </div>
                        </td>
                    </tr>
                `;
            });

            $('#servicesTableBody').html(html);
        },

        // ========================================
        // MODAL OPERATIONS
        // ========================================
        openModal: function (mode, data = null) {
            const self = this;
            
            console.log('=== OPEN MODAL CALLED ===');
            console.log('Mode:', mode);
            console.log('Data:', data);
            console.log('Data is truthy:', !!data);
            
            this.editMode = mode === 'edit';
            console.log('Edit mode set to:', this.editMode);
            
            // Dispose existing modal if any
            if (this.modal) {
                this.modal.dispose();
                this.modal = null;
            }
            
            // Reset form first
            this.resetForm();

            // Re-populate dropdowns (in case modal was destroyed)
            this.populateDropdowns();

            // Update modal title and button
            if (this.editMode && data) {
                console.log('Setting modal to EDIT mode');
                $('#modalTitle').html('<i class="bi bi-pencil text-white me-2"></i>Edit Service 编辑服务');
                $('#btnSaveService').html('<i class="bi bi-check-circle me-1"></i> Update 更新');
            } else {
                console.log('Setting modal to ADD mode (editMode=' + this.editMode + ', data=' + !!data + ')');
                $('#modalTitle').html('<i class="bi bi-plus-circle text-white me-2"></i>Add New Service 添加服务');
                $('#btnSaveService').html('<i class="bi bi-check-circle me-1"></i> Save 保存');
                // Set defaults for new service
                $('#serviceStatus').val('active');
                $('#isAddon').prop('checked', false);
                this.toggleAddonRequirements(false);
            }

            console.log('Modal title after update:', $('#modalTitle').text());

            // Create modal
            const modalElement = document.getElementById('serviceModal');
            this.modal = new bootstrap.Modal(modalElement);
            
            // Populate form AFTER modal is fully shown
            if (this.editMode && data) {
                $(modalElement).one('shown.bs.modal', function () {
                    console.log('Modal shown event fired, populating form...');
                    self.populateForm(data);
                });
            }
            
            // Show modal
            this.modal.show();
            console.log('Modal show() called');
        },

        populateForm: function (data) {
            console.log('Populating form with data:', data);
            
            $('#serviceId').val(data.id);
            $('#serviceName').val(data.name || '');
            $('#serviceNameSecondary').val(data.name_secondary || '');
            $('#serviceStatus').val(data.status || 'active');
            $('#isAddon').prop('checked', !!data.is_addon);
            $('#serviceAmount').val(data.amount || '0.00');
            $('#ledgerId').val(data.ledger_id || '');

            // Update addon requirements state AFTER setting checkbox
            this.toggleAddonRequirements(!!data.is_addon);
            
            console.log('Form populated - Name:', $('#serviceName').val());
            console.log('Form populated - Name(Secondary):', $('#serviceNameSecondary').val());
            console.log('Form populated - Status:', $('#serviceStatus').val());
            console.log('Form populated - Is Addon:', $('#isAddon').is(':checked'));
            console.log('Form populated - Amount:', $('#serviceAmount').val());
            console.log('Form populated - Ledger ID:', $('#ledgerId').val());
        },

        resetForm: function () {
            $('#serviceForm')[0].reset();
            $('#serviceId').val('');
            $('#serviceNameSecondary').val('');
            $('#isAddon').prop('checked', false);
            this.toggleAddonRequirements(false);
            this.selectedService = null;
            // this.editMode = false;
            
            // Remove validation classes
            $('#serviceForm').removeClass('was-validated');
            $('.form-control, .form-select').removeClass('is-invalid');
        },

        // ========================================
        // CRUD OPERATIONS
        // ========================================
        saveService: function () {
            const self = this;

            const serviceId = $('#serviceId').val();
            const isAddon = $('#isAddon').is(':checked');

            const data = {
                name: $('#serviceName').val().trim(),
                name_secondary: $('#serviceNameSecondary').val().trim() || null,
                description: null, // Hidden field
                service_type_id: null, // Hidden field
                is_addon: isAddon,
                amount: $('#serviceAmount').val() ? parseFloat($('#serviceAmount').val()) : 0,
                ledger_id: $('#ledgerId').val() || null,
                status: $('#serviceStatus').val()
            };

            // Validation
            if (!data.name) {
                TempleCore.showToast('Please enter name 请输入名称', 'error');
                $('#serviceName').focus().addClass('is-invalid');
                return;
            }

            if (!data.status) {
                TempleCore.showToast('Please select status 请选择状态', 'error');
                $('#serviceStatus').focus().addClass('is-invalid');
                return;
            }

            // Amount and Ledger are required only if addon is checked
            if (isAddon) {
                if (!data.amount || parseFloat(data.amount) < 0) {
                    TempleCore.showToast('Amount is required when service is marked as addon 选中附加服务时金额为必填项', 'error');
                    $('#serviceAmount').focus().addClass('is-invalid');
                    return;
                }
                if (!data.ledger_id) {
                    TempleCore.showToast('Ledger is required when service is marked as addon 选中附加服务时账簿为必填项', 'error');
                    $('#ledgerId').focus().addClass('is-invalid');
                    return;
                }
            }

            // Show loading
            $('#btnSaveService').prop('disabled', true).html('<span class="spinner-border spinner-border-sm me-2"></span>Saving 保存中...');

            let apiCall;
            if (serviceId) {
                apiCall = TempleAPI.put(`/occasion-services-master/${serviceId}`, data);
            } else {
                apiCall = TempleAPI.post('/occasion-services-master', data);
            }

            apiCall
                .done(function (response) {
                    if (response.success) {
                        TempleCore.showToast(response.message || 'Service saved successfully 服务保存成功', 'success');
                        self.modal.hide();
                        self.loadServices();
                    } else {
                        if (response.errors) {
                            // Display first validation error
                            const firstError = Object.values(response.errors)[0];
                            TempleCore.showToast(firstError[0] || 'Validation failed 验证失败', 'error');
                        } else {
                            TempleCore.showToast(response.message || 'Failed to save 保存失败', 'error');
                        }
                    }
                })
                .fail(function (xhr) {
                    const error = xhr.responseJSON?.message || 'Failed to save service 保存服务失败';
                    TempleCore.showToast(error, 'error');
                })
                .always(function () {
                    const btnText = self.editMode ? 'Update 更新' : 'Save 保存';
                    $('#btnSaveService').prop('disabled', false).html(`<i class="bi bi-check-circle me-1"></i> ${btnText}`);
                });
        },

        editService: function (id) {
            const self = this;
            const $editBtn = $(`.btn-edit[data-id="${id}"]`);
            
            console.log('=== EDIT SERVICE STARTED ===');
            console.log('Service ID:', id);
            
            // Show loading on button
            const originalHtml = $editBtn.html();
            $editBtn.html('<span class="spinner-border spinner-border-sm"></span>').prop('disabled', true);
            
            // Fetch fresh data from API
            TempleAPI.get(`/occasion-services-master/${id}`, {})
                .done(function (response) {
                    console.log('API Response:', response);
                    console.log('Response success:', response.success);
                    console.log('Response data:', response.data);
                    
                    if (response.success && response.data) {
                        self.selectedService = response.data;
                        console.log('Calling openModal with mode=edit and data:', response.data);
                        self.openModal('edit', response.data);
                    } else {
                        console.error('API response missing data:', response);
                        TempleCore.showToast('Failed to load service details 加载服务详情失败', 'error');
                    }
                })
                .fail(function (xhr) {
                    console.error('API call failed:', xhr);
                    console.error('Status:', xhr.status);
                    console.error('Response:', xhr.responseJSON);
                    TempleCore.showToast('Failed to load service details 加载服务详情失败', 'error');
                })
                .always(function () {
                    // Restore button
                    $editBtn.html(originalHtml).prop('disabled', false);
                });
        },

        deleteService: function (id) {
            const self = this;
            const service = this.services.find(s => s.id === id);
            const serviceName = service ? service.name : 'this service';

            Swal.fire({
                title: 'Delete Service? 删除服务？',
                html: `Are you sure you want to delete <strong>${this.escapeHtml(serviceName)}</strong>?<br><small class="text-muted">This action cannot be undone. 此操作无法撤消。</small>`,
                icon: 'warning',
                showCancelButton: true,
                confirmButtonColor: '#dc3545',
                confirmButtonText: '<i class="bi bi-trash me-1"></i> Yes, delete it! 是的，删除！',
                cancelButtonText: 'Cancel 取消'
            }).then((result) => {
                if (result.isConfirmed) {
                    TempleAPI.delete(`/occasion-services-master/${id}`)
                        .done(function (response) {
                            if (response.success) {
                                TempleCore.showToast('Service deleted successfully 服务删除成功', 'success');
                                self.loadServices();
                            } else {
                                TempleCore.showToast(response.message || 'Failed to delete service 删除服务失败', 'error');
                            }
                        })
                        .fail(function (xhr) {
                            const error = xhr.responseJSON?.message || 'Failed to delete service 删除服务失败';
                            TempleCore.showToast(error, 'error');
                        });
                }
            });
        },

        toggleStatus: function (id, currentStatus) {
            const self = this;
            const newStatus = currentStatus === 'active' ? 'inactive' : 'active';

            $.ajax({
                url: window.APP_CONFIG.API.BASE_URL + `/occasion-services-master/${id}/status`,
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
                        TempleCore.showToast(`Status changed to ${newStatus} 状态已更改为${newStatus === 'active' ? '启用' : '停用'}`, 'success');
                        self.loadServices();
                    }
                })
                .fail(function () {
                    TempleCore.showToast('Failed to update status 更新状态失败', 'error');
                });
        },

        // ========================================
        // UTILITY FUNCTIONS
        // ========================================
        escapeHtml: function (text) {
            if (!text) return '';
            const div = document.createElement('div');
            div.textContent = text;
            return div.innerHTML;
        }
    };

})(jQuery, window);