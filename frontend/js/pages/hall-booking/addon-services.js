// frontend/js/pages/hall-booking/addon-services.js
// Complete Add-On Services Master with dual pricing, groups and services tabs

(function ($, window) {
  "use strict";

  window.AddonServicesPage = {
    currentUser: null,
    activeTab: "groups",

    // Groups data
    groupsData: [],
    groupsCurrentPage: 1,
    groupsPerPage: 10,
    groupsTotalPages: 1,
    groupsFilters: {
      search: "",
      status: "",
    },

    // Services data
    servicesData: [],
    servicesCurrentPage: 1,
    servicesPerPage: 10,
    servicesTotalPages: 1,
    servicesFilters: {
      search: "",
      status: "",
      addon_group_id: "",
    },

    editMode: false,
    editId: null,
    addonGroups: [],

    init: function () {
      this.currentUser = JSON.parse(
        localStorage.getItem(window.APP_CONFIG.STORAGE.USER) || "{}"
      );
      this.render();
      this.bindEvents();
      this.initAnimations();
      this.loadAddonGroups();
      this.loadGroups();
    },

    render: function () {
      const html = `
                <!-- Page Header -->
                <div class="addon-header-bg" style="background: linear-gradient(135deg, #fa709a 0%, #fee140 100%); padding: 2rem 0; margin-bottom: 2rem; border-radius: 15px; position: relative; overflow: hidden;">
                    <div class="container">
                        <div class="row align-items-center">
                            <div class="col-md-8" data-aos="fade-right">
                                <div class="d-flex align-items-center">
                                    <div class="addon-header-icon" style="background: rgba(255,255,255,0.2); width: 70px; height: 70px; border-radius: 15px; display: flex; align-items: center; justify-content: center; margin-right: 1.5rem;">
                                        <i class="bi bi-layers-fill" style="font-size: 2rem; color: white;"></i>
                                    </div>
                                    <div>
                                        <h2 class="mb-0 text-white">Add-On Services Master</h2>
                                        <p class="mb-0 text-white-50">附加服务管理</p>
                                        <small class="text-white-75">Manage service groups and items with dual pricing</small>
                                    </div>
                                </div>
                            </div>
                            <div class="col-md-4 text-end" data-aos="fade-left">
                                <button class="btn btn-light btn-lg" id="btnAddItem">
                                    <i class="bi bi-plus-circle"></i> <span id="addBtnText">Add New Group</span>
                                    <br><small id="addBtnTextChinese">添加新组</small>
                                </button>
                            </div>
                        </div>
                    </div>
                </div>

                <!-- Tab Navigation -->
                <div class="container mb-4">
                    <div class="card border-0 shadow-sm" data-aos="fade-up">
                        <div class="card-body p-0">
                            <ul class="nav nav-tabs nav-fill" role="tablist">
                                <li class="nav-item" role="presentation">
                                    <button class="nav-link active" id="groupsTab" data-tab="groups" type="button">
                                        <i class="bi bi-folder-fill"></i> Service Groups / 服务组
                                        <br><small class="text-muted">Categories for organizing services</small>
                                    </button>
                                </li>
                                <li class="nav-item" role="presentation">
                                    <button class="nav-link" id="servicesTab" data-tab="services" type="button">
                                        <i class="bi bi-list-check"></i> Service Items / 服务项目
                                        <br><small class="text-muted">Individual services with dual pricing</small>
                                    </button>
                                </li>
                            </ul>
                        </div>
                    </div>
                </div>

                <!-- Groups View -->
                <div id="groupsView" class="container">
                    <!-- Filters -->
                    <div class="card border-0 shadow-sm mb-4" data-aos="fade-up">
                        <div class="card-body">
                            <div class="row g-3">
                                <div class="col-md-6">
                                    <label class="form-label">
                                        <i class="bi bi-search"></i> Search Groups
                                        <span class="text-muted">/ 搜索组</span>
                                    </label>
                                    <input type="text" class="form-control" id="searchGroupsInput" placeholder="Search by name...">
                                </div>
                                <div class="col-md-3">
                                    <label class="form-label">
                                        <i class="bi bi-funnel"></i> Status
                                        <span class="text-muted">/ 状态</span>
                                    </label>
                                    <select class="form-select" id="statusGroupsFilter">
                                        <option value="">All Status / 所有状态</option>
                                        <option value="1">Active / 活跃</option>
                                        <option value="0">Inactive / 非活跃</option>
                                    </select>
                                </div>
                                <div class="col-md-3 d-flex align-items-end">
                                    <button class="btn btn-outline-secondary w-100" id="btnClearGroupsFilter">
                                        <i class="bi bi-x-circle"></i> Clear / 清除
                                    </button>
                                </div>
                            </div>
                        </div>
                    </div>

                    <!-- Groups Table -->
                    <div class="card border-0 shadow-sm" data-aos="fade-up" data-aos-delay="100">
                        <div class="card-header bg-white border-0 py-3">
                            <div class="d-flex justify-content-between align-items-center">
                                <h5 class="mb-0">
                                    <i class="bi bi-list-ul text-primary"></i> Groups List / 组列表
                                </h5>
                                <div class="text-muted" id="groupsRecordCount">
                                    <small>Loading...</small>
                                </div>
                            </div>
                        </div>
                        <div class="card-body p-0">
                            <div class="table-responsive">
                                <table class="table table-hover mb-0">
                                    <thead class="table-light">
                                        <tr>
                                            <th width="5%">#</th>
                                            <th width="5%">Icon</th>
                                            <th width="25%">Group Name / 组名</th>
                                            <th width="15%">Display Order / 显示顺序</th>
                                            <th width="15%">Services Count / 服务数量</th>
                                            <th width="12%">Status / 状态</th>
                                            <th width="18%" class="text-center">Actions / 操作</th>
                                        </tr>
                                    </thead>
                                    <tbody id="groupsTableBody">
                                        <tr>
                                            <td colspan="7" class="text-center py-5">
                                                <div class="spinner-border text-primary" role="status"></div>
                                                <p class="mt-2 text-muted">Loading groups...</p>
                                            </td>
                                        </tr>
                                    </tbody>
                                </table>
                            </div>
                        </div>
                        <div class="card-footer bg-white border-0">
                            <div class="d-flex justify-content-between align-items-center">
                                <div id="groupsPaginationInfo" class="text-muted">
                                    <small>Showing 0 of 0 records</small>
                                </div>
                                <nav>
                                    <ul class="pagination pagination-sm mb-0" id="groupsPaginationContainer"></ul>
                                </nav>
                            </div>
                        </div>
                    </div>
                </div>

                <!-- Services View -->
                <div id="servicesView" class="container" style="display: none;">
                    <!-- Filters -->
                    <div class="card border-0 shadow-sm mb-4" data-aos="fade-up">
                        <div class="card-body">
                            <div class="row g-3">
                                <div class="col-md-4">
                                    <label class="form-label">
                                        <i class="bi bi-search"></i> Search Services
                                        <span class="text-muted">/ 搜索服务</span>
                                    </label>
                                    <input type="text" class="form-control" id="searchServicesInput" placeholder="Search by name...">
                                </div>
                                <div class="col-md-3">
                                    <label class="form-label">
                                        <i class="bi bi-folder"></i> Group
                                        <span class="text-muted">/ 组</span>
                                    </label>
                                    <select class="form-select" id="groupFilter">
                                        <option value="">All Groups / 所有组</option>
                                    </select>
                                </div>
                                <div class="col-md-2">
                                    <label class="form-label">
                                        <i class="bi bi-funnel"></i> Status
                                    </label>
                                    <select class="form-select" id="statusServicesFilter">
                                        <option value="">All / 全部</option>
                                        <option value="1">Active / 活跃</option>
                                        <option value="0">Inactive / 非活跃</option>
                                    </select>
                                </div>
                                <div class="col-md-3 d-flex align-items-end">
                                    <button class="btn btn-outline-secondary w-100" id="btnClearServicesFilter">
                                        <i class="bi bi-x-circle"></i> Clear / 清除
                                    </button>
                                </div>
                            </div>
                        </div>
                    </div>

                    <!-- Services Table -->
                    <div class="card border-0 shadow-sm" data-aos="fade-up" data-aos-delay="100">
                        <div class="card-header bg-white border-0 py-3">
                            <div class="d-flex justify-content-between align-items-center">
                                <h5 class="mb-0">
                                    <i class="bi bi-list-ul text-primary"></i> Services List / 服务列表
                                </h5>
                                <div class="text-muted" id="servicesRecordCount">
                                    <small>Loading...</small>
                                </div>
                            </div>
                        </div>
                        <div class="card-body p-0">
                            <div class="table-responsive">
                                <table class="table table-hover mb-0">
                                    <thead class="table-light">
                                        <tr>
                                            <th width="4%">#</th>
                                            <th width="20%">Service Name / 服务名</th>
                                            <th width="15%">Group / 组</th>
                                            <th width="10%">Unit / 单位</th>
                                            <th width="13%">Internal / 内部</th>
                                            <th width="13%">External / 外部</th>
                                            <th width="10%">Status / 状态</th>
                                            <th width="15%" class="text-center">Actions / 操作</th>
                                        </tr>
                                    </thead>
                                    <tbody id="servicesTableBody">
                                        <tr>
                                            <td colspan="8" class="text-center py-5">
                                                <div class="spinner-border text-primary" role="status"></div>
                                                <p class="mt-2 text-muted">Loading services...</p>
                                            </td>
                                        </tr>
                                    </tbody>
                                </table>
                            </div>
                        </div>
                        <div class="card-footer bg-white border-0">
                            <div class="d-flex justify-content-between align-items-center">
                                <div id="servicesPaginationInfo" class="text-muted">
                                    <small>Showing 0 of 0 records</small>
                                </div>
                                <nav>
                                    <ul class="pagination pagination-sm mb-0" id="servicesPaginationContainer"></ul>
                                </nav>
                            </div>
                        </div>
                    </div>
                </div>

                <!-- Group Modal -->
                <div class="modal fade" id="groupModal" tabindex="-1">
                    <div class="modal-dialog modal-lg modal-dialog-centered">
                        <div class="modal-content">
                            <div class="modal-header bg-gradient-primary text-white">
                                <h5 class="modal-title">
                                    <i class="bi bi-folder-fill"></i> <span id="groupModalTitle">Add New Group</span>
                                </h5>
                                <button type="button" class="btn-close btn-close-white" data-bs-dismiss="modal"></button>
                            </div>
                            <div class="modal-body">
                                <form id="groupForm">
                                    <div class="row g-3">
                                        <div class="col-md-6">
                                            <label class="form-label required">
                                                Group Name (English) <span class="text-danger">*</span>
                                            </label>
                                            <input type="text" class="form-control" id="groupName" required placeholder="e.g., Audio System">
                                        </div>
                                        <div class="col-md-6">
                                            <label class="form-label">
                                                Group Name (Chinese) / 组名
                                            </label>
                                            <input type="text" class="form-control" id="groupNameChinese" placeholder="例如：音响系统">
                                        </div>
                                        <div class="col-md-6">
                                            <label class="form-label">
                                                <i class="bi bi-emoji-smile"></i> Icon (Bootstrap Icon)
                                            </label>
                                            <select class="form-select" id="groupIcon">
                                                <option value="">Select Icon / 选择图标</option>
                                                <option value="bi-speaker">Speaker (音响)</option>
                                                <option value="bi-table">Table (桌子)</option>
                                                <option value="bi-mic">Microphone (麦克风)</option>
                                                <option value="bi-door-open">Room (房间)</option>
                                                <option value="bi-lamp">Lighting (灯光)</option>
                                                <option value="bi-camera-video">Video (视频)</option>
                                                <option value="bi-projector">Projector (投影仪)</option>
                                                <option value="bi-wifi">WiFi (无线网)</option>
                                                <option value="bi-gift">Decoration (装饰)</option>
                                                <option value="bi-cup-hot">Catering (餐饮)</option>
                                            </select>
                                        </div>
                                        <div class="col-md-6">
                                            <label class="form-label">
                                                <i class="bi bi-sort-numeric-down"></i> Display Order / 显示顺序
                                            </label>
                                            <input type="number" class="form-control" id="displayOrder" min="0" value="0">
                                        </div>
                                        <div class="col-12">
                                            <label class="form-label">Description (English)</label>
                                            <textarea class="form-control" id="groupDescription" rows="2"></textarea>
                                        </div>
                                        <div class="col-12">
                                            <label class="form-label">Description (Chinese) / 描述</label>
                                            <textarea class="form-control" id="groupDescriptionChinese" rows="2"></textarea>
                                        </div>
                                        <div class="col-12">
                                            <label class="form-label required">Status / 状态 <span class="text-danger">*</span></label>
                                            <div class="row g-3">
                                                <div class="col-md-6">
                                                    <div class="form-check-card p-3 border rounded">
                                                        <input class="form-check-input" type="radio" name="groupStatus" id="groupStatusActive" value="1" checked>
                                                        <label class="form-check-label w-100" for="groupStatusActive">
                                                            <div class="d-flex align-items-center">
                                                                <i class="bi bi-check-circle-fill text-success fs-4 me-2"></i>
                                                                <div><strong>Active / 活跃</strong></div>
                                                            </div>
                                                        </label>
                                                    </div>
                                                </div>
                                                <div class="col-md-6">
                                                    <div class="form-check-card p-3 border rounded">
                                                        <input class="form-check-input" type="radio" name="groupStatus" id="groupStatusInactive" value="0">
                                                        <label class="form-check-label w-100" for="groupStatusInactive">
                                                            <div class="d-flex align-items-center">
                                                                <i class="bi bi-x-circle-fill text-danger fs-4 me-2"></i>
                                                                <div><strong>Inactive / 非活跃</strong></div>
                                                            </div>
                                                        </label>
                                                    </div>
                                                </div>
                                            </div>
                                        </div>
                                    </div>
                                </form>
                            </div>
                            <div class="modal-footer">
                                <button type="button" class="btn btn-secondary" data-bs-dismiss="modal">
                                    <i class="bi bi-x-circle"></i> Cancel / 取消
                                </button>
                                <button type="button" class="btn btn-primary" id="btnSaveGroup">
                                    <i class="bi bi-check-circle"></i> <span id="btnSaveGroupText">Save Group / 保存</span>
                                </button>
                            </div>
                        </div>
                    </div>
                </div>

                <!-- Service Modal -->
                <div class="modal fade" id="serviceModal" tabindex="-1">
                    <div class="modal-dialog modal-lg modal-dialog-centered modal-dialog-scrollable">
                        <div class="modal-content">
                            <div class="modal-header bg-gradient-primary text-white">
                                <h5 class="modal-title">
                                    <i class="bi bi-list-check"></i> <span id="serviceModalTitle">Add New Service</span>
                                </h5>
                                <button type="button" class="btn-close btn-close-white" data-bs-dismiss="modal"></button>
                            </div>
                            <div class="modal-body">
                                <form id="serviceForm">
                                    <div class="row g-3">
                                        <div class="col-12">
                                            <label class="form-label required">
                                                <i class="bi bi-folder"></i> Service Group / 服务组 <span class="text-danger">*</span>
                                            </label>
                                            <select class="form-select" id="serviceGroupId" required>
                                                <option value="">Select Group / 选择组</option>
                                            </select>
                                            <div class="invalid-feedback">Please select a group</div>
                                        </div>

                                        <div class="col-md-6">
                                            <label class="form-label required">
                                                Service Name (English) <span class="text-danger">*</span>
                                            </label>
                                            <input type="text" class="form-control" id="serviceName" required placeholder="e.g., Professional Sound System">
                                        </div>
                                        <div class="col-md-6">
                                            <label class="form-label">
                                                Service Name (Chinese) / 服务名
                                            </label>
                                            <input type="text" class="form-control" id="serviceNameChinese" placeholder="例如：专业音响系统">
                                        </div>

                                        <div class="col-12">
                                            <div class="alert alert-info border-0">
                                                <i class="bi bi-info-circle-fill"></i> 
                                                <strong>Dual Pricing:</strong> Set different rates for internal members and external customers
                                            </div>
                                        </div>

                                        <div class="col-md-6">
                                            <label class="form-label required">
                                                <i class="bi bi-person-badge"></i> Internal Amount (RM) / 内部金额 <span class="text-danger">*</span>
                                            </label>
                                            <div class="input-group">
                                                <span class="input-group-text bg-success text-white">RM</span>
                                                <input type="number" step="0.01" class="form-control" id="internalAmount" required min="0" placeholder="0.00">
                                            </div>
                                            <small class="text-muted">Price for temple members</small>
                                        </div>

                                        <div class="col-md-6">
                                            <label class="form-label required">
                                                <i class="bi bi-globe"></i> External Amount (RM) / 外部金额 <span class="text-danger">*</span>
                                            </label>
                                            <div class="input-group">
                                                <span class="input-group-text bg-primary text-white">RM</span>
                                                <input type="number" step="0.01" class="form-control" id="externalAmount" required min="0" placeholder="0.00">
                                            </div>
                                            <small class="text-muted">Price for external customers</small>
                                        </div>

                                        <div class="col-12">
                                            <div class="alert alert-light border mb-0">
                                                <div class="row text-center">
                                                    <div class="col-md-4">
                                                        <small class="text-muted">Internal Price</small>
                                                        <div class="h5 text-success mb-0" id="displayInternalPrice">RM 0.00</div>
                                                    </div>
                                                    <div class="col-md-4">
                                                        <small class="text-muted">External Price</small>
                                                        <div class="h5 text-primary mb-0" id="displayExternalPrice">RM 0.00</div>
                                                    </div>
                                                    <div class="col-md-4">
                                                        <small class="text-muted">Difference</small>
                                                        <div class="h5 text-warning mb-0" id="displayPriceDiff">RM 0.00</div>
                                                    </div>
                                                </div>
                                            </div>
                                        </div>

                                        <div class="col-md-6">
                                            <label class="form-label">
                                                <i class="bi bi-rulers"></i> Unit / 单位
                                            </label>
                                            <select class="form-select" id="serviceUnit">
                                                <option value="">Select Unit / 选择单位</option>
                                                <option value="per hour">Per Hour / 每小时</option>
                                                <option value="per day">Per Day / 每天</option>
                                                <option value="per set">Per Set / 每套</option>
                                                <option value="per piece">Per Piece / 每件</option>
                                                <option value="per session">Per Session / 每场</option>
                                                <option value="per person">Per Person / 每人</option>
                                            </select>
                                        </div>

                                        <div class="col-md-6">
                                            <label class="form-label required">Status <span class="text-danger">*</span></label>
                                            <div class="d-flex gap-3 mt-2">
                                                <div class="form-check">
                                                    <input class="form-check-input" type="radio" name="serviceStatus" id="serviceStatusActive" value="1" checked>
                                                    <label class="form-check-label" for="serviceStatusActive">
                                                        <i class="bi bi-check-circle-fill text-success"></i> Active
                                                    </label>
                                                </div>
                                                <div class="form-check">
                                                    <input class="form-check-input" type="radio" name="serviceStatus" id="serviceStatusInactive" value="0">
                                                    <label class="form-check-label" for="serviceStatusInactive">
                                                        <i class="bi bi-x-circle-fill text-danger"></i> Inactive
                                                    </label>
                                                </div>
                                            </div>
                                        </div>

                                        <div class="col-12">
                                            <label class="form-label">Description (English)</label>
                                            <textarea class="form-control" id="serviceDescription" rows="2"></textarea>
                                        </div>
                                        <div class="col-12">
                                            <label class="form-label">Description (Chinese) / 描述</label>
                                            <textarea class="form-control" id="serviceDescriptionChinese" rows="2"></textarea>
                                        </div>
                                    </div>
                                </form>
                            </div>
                            <div class="modal-footer">
                                <button type="button" class="btn btn-secondary" data-bs-dismiss="modal">
                                    <i class="bi bi-x-circle"></i> Cancel / 取消
                                </button>
                                <button type="button" class="btn btn-primary" id="btnSaveService">
                                    <i class="bi bi-check-circle"></i> <span id="btnSaveServiceText">Save Service / 保存</span>
                                </button>
                            </div>
                        </div>
                    </div>
                </div>
            `;

      $("#page-container").html(html);
    },

    initAnimations: function () {
      AOS.init({
        duration: 800,
        easing: "ease-out-cubic",
        once: true,
        offset: 100,
      });
      gsap.to(".addon-header-bg", {
        backgroundPosition: "100% 50%",
        duration: 20,
        repeat: -1,
        yoyo: true,
        ease: "none",
      });
      gsap.to(".addon-header-icon", {
        y: -10,
        duration: 2,
        repeat: -1,
        yoyo: true,
        ease: "power1.inOut",
      });
    },

    bindEvents: function () {
      const self = this;

      $(".nav-tabs button").on("click", function () {
        self.switchTab($(this).data("tab"));
      });

      $("#btnAddItem").on("click", function () {
        if (self.activeTab === "groups") {
          self.openGroupModal(false);
        } else {
          self.openServiceModal(false);
        }
      });

      $("#btnSaveGroup").on("click", () => this.saveGroup());
      $("#btnSaveService").on("click", () => this.saveService());

      let groupsSearchTimeout;
      $("#searchGroupsInput").on("input", function () {
        clearTimeout(groupsSearchTimeout);
        groupsSearchTimeout = setTimeout(() => {
          self.groupsFilters.search = $("#searchGroupsInput").val();
          self.groupsCurrentPage = 1;
          self.loadGroups();
        }, 500);
      });

      $("#statusGroupsFilter").on("change", function () {
        self.groupsFilters.status = $(this).val();
        self.groupsCurrentPage = 1;
        self.loadGroups();
      });

      $("#btnClearGroupsFilter").on("click", () => this.clearGroupsFilters());

      let servicesSearchTimeout;
      $("#searchServicesInput").on("input", function () {
        clearTimeout(servicesSearchTimeout);
        servicesSearchTimeout = setTimeout(() => {
          self.servicesFilters.search = $("#searchServicesInput").val();
          self.servicesCurrentPage = 1;
          self.loadServices();
        }, 500);
      });

      $("#groupFilter, #statusServicesFilter").on("change", function () {
        self.servicesFilters.addon_group_id = $("#groupFilter").val();
        self.servicesFilters.status = $("#statusServicesFilter").val();
        self.servicesCurrentPage = 1;
        self.loadServices();
      });

      $("#btnClearServicesFilter").on("click", () =>
        this.clearServicesFilters()
      );
      $("#internalAmount, #externalAmount").on("input", () =>
        this.updatePriceDisplay()
      );

      $(document).on("change", 'input[type="radio"]', function () {
        const $parent = $(this).closest(".form-check-card");
        if ($parent.length) {
          const $siblings = $parent
            .parent()
            .siblings()
            .find(".form-check-card");
          gsap.to($parent[0], {
            scale: 1.05,
            boxShadow: "0 8px 20px rgba(250, 112, 154, 0.3)",
            borderColor: "#fa709a",
            duration: 0.3,
            ease: "back.out(1.7)",
          });
          $siblings.each(function () {
            gsap.to(this, {
              scale: 1,
              boxShadow: "none",
              borderColor: "#dee2e6",
              duration: 0.3,
            });
          });
        }
      });

      $(document)
        .on("focus", ".form-control, .form-select", function () {
          gsap.to($(this), { scale: 1.02, duration: 0.2 });
        })
        .on("blur", ".form-control, .form-select", function () {
          gsap.to($(this), { scale: 1, duration: 0.2 });
        });
    },

    switchTab: function (tab) {
      this.activeTab = tab;
      $(".nav-tabs button").removeClass("active");
      $(`#${tab}Tab`).addClass("active");

      if (tab === "groups") {
        $("#groupsView").show();
        $("#servicesView").hide();
        $("#addBtnText").text("Add New Group");
        $("#addBtnTextChinese").text("添加新组");
        this.loadGroups();
      } else {
        $("#groupsView").hide();
        $("#servicesView").show();
        $("#addBtnText").text("Add New Service");
        $("#addBtnTextChinese").text("添加新服务");
        this.loadServices();
      }

      gsap.from(`#${tab}View`, {
        opacity: 0,
        x: 30,
        duration: 0.5,
        ease: "power2.out",
      });
    },

    loadAddonGroups: function () {
      const self = this;
      TempleAPI.get("/hall-booking/addon-groups/active").done(function (
        response
      ) {
        if (response.success) {
          self.addonGroups = response.data;
          self.populateGroupDropdowns();
        }
      });
    },

    populateGroupDropdowns: function () {
      const options = this.addonGroups
        .map(
          (g) =>
            `<option value="${g.id}">${g.group_name} ${
              g.group_name_chinese ? "/ " + g.group_name_chinese : ""
            }</option>`
        )
        .join("");
      $("#groupFilter, #serviceGroupId").append(options);
    },

    clearGroupsFilters: function () {
      this.groupsFilters = { search: "", status: "" };
      $("#searchGroupsInput, #statusGroupsFilter").val("");
      this.groupsCurrentPage = 1;
      this.loadGroups();
      TempleCore.showToast("Filters cleared", "info");
    },

    clearServicesFilters: function () {
      this.servicesFilters = { search: "", status: "", addon_group_id: "" };
      $("#searchServicesInput, #groupFilter, #statusServicesFilter").val("");
      this.servicesCurrentPage = 1;
      this.loadServices();
      TempleCore.showToast("Filters cleared", "info");
    },

    loadGroups: function () {
      const self = this;
      const params = {
        page: this.groupsCurrentPage,
        per_page: this.groupsPerPage,
        ...this.groupsFilters,
      };

      TempleAPI.get("/hall-booking/addon-groups", params)
        .done(function (response) {
          if (response.success) {
            self.groupsData = response.data;
            self.groupsTotalPages = response.pagination.total_pages;
            self.renderGroupsTable(response.data, response.pagination);
            self.renderPagination("groups", response.pagination);
          }
        })
        .fail(function (error) {
          console.error("Error loading groups:", error);
          TempleCore.showToast("Error loading groups", "error");
        });
    },

    renderGroupsTable: function (groups, pagination) {
      const tbody = $("#groupsTableBody");
      tbody.empty();

      if (groups.length === 0) {
        tbody.html(
          `<tr><td colspan="7" class="text-center py-5"><i class="bi bi-inbox fs-1 text-muted"></i><p class="mt-2 text-muted">No groups found / 未找到组</p></td></tr>`
        );
        $("#groupsRecordCount").html("<small>0 records</small>");
        return;
      }

      groups.forEach((group, index) => {
        const rowNumber =
          (pagination.current_page - 1) * pagination.per_page + index + 1;
        const statusBadge =
          group.status === 1
            ? '<span class="badge bg-success">Active</span>'
            : '<span class="badge bg-danger">Inactive</span>';
        const icon = group.icon ? `<i class="bi ${group.icon} fs-4"></i>` : "-";

        const row = `
                    <tr data-aos="fade-up" data-aos-delay="${index * 50}">
                        <td>${rowNumber}</td>
                        <td>${icon}</td>
                        <td><strong>${group.group_name}</strong>${
          group.group_name_chinese
            ? `<br><small class="text-muted">${group.group_name_chinese}</small>`
            : ""
        }</td>
                        <td><span class="badge bg-info">${
                          group.display_order
                        }</span></td>
                        <td><span class="badge bg-primary">${
                          group.services_count || 0
                        } services</span></td>
                        <td>${statusBadge}</td>
                        <td class="text-center">
                            <div class="btn-group btn-group-sm">
                                <button class="btn btn-outline-primary" onclick="AddonServicesPage.editGroup(${
                                  group.id
                                })" title="Edit"><i class="bi bi-pencil"></i></button>
                                <button class="btn btn-outline-danger" onclick="AddonServicesPage.deleteGroup(${
                                  group.id
                                }, '${
          group.group_name
        }')" title="Delete"><i class="bi bi-trash"></i></button>
                            </div>
                        </td>
                    </tr>
                `;
        tbody.append(row);
      });

      $("#groupsRecordCount").html(
        `<small>Showing ${pagination.from} to ${pagination.to} of ${pagination.total} records</small>`
      );
      AOS.refresh();
    },

    loadServices: function () {
      const self = this;
      const params = {
        page: this.servicesCurrentPage,
        per_page: this.servicesPerPage,
        ...this.servicesFilters,
      };

      TempleAPI.get("/hall-booking/addon-services", params)
        .done(function (response) {
          if (response.success) {
            self.servicesData = response.data;
            self.servicesTotalPages = response.pagination.total_pages;
            self.renderServicesTable(response.data, response.pagination);
            self.renderPagination("services", response.pagination);
          }
        })
        .fail(function (error) {
          console.error("Error loading services:", error);
          TempleCore.showToast("Error loading services", "error");
        });
    },

    renderServicesTable: function (services, pagination) {
      const tbody = $("#servicesTableBody");
      tbody.empty();

      if (services.length === 0) {
        tbody.html(
          `<tr><td colspan="8" class="text-center py-5"><i class="bi bi-inbox fs-1 text-muted"></i><p class="mt-2 text-muted">No services found / 未找到服务</p></td></tr>`
        );
        $("#servicesRecordCount").html("<small>0 records</small>");
        return;
      }

      services.forEach((service, index) => {
        const rowNumber =
          (pagination.current_page - 1) * pagination.per_page + index + 1;
        const statusBadge =
          service.status === 1
            ? '<span class="badge bg-success">Active</span>'
            : '<span class="badge bg-danger">Inactive</span>';

        const row = `
                    <tr data-aos="fade-up" data-aos-delay="${index * 50}">
                        <td>${rowNumber}</td>
                        <td><strong>${service.service_name}</strong>${
          service.service_name_chinese
            ? `<br><small class="text-muted">${service.service_name_chinese}</small>`
            : ""
        }</td>
                        <td>${service.group?.group_name || "-"}</td>
                        <td>${service.unit || "-"}</td>
                        <td><strong class="text-success">${
                          service.internal_amount_formatted
                        }</strong></td>
                        <td><strong class="text-primary">${
                          service.external_amount_formatted
                        }</strong></td>
                        <td>${statusBadge}</td>
                        <td class="text-center">
                            <div class="btn-group btn-group-sm">
                                <button class="btn btn-outline-primary" onclick="AddonServicesPage.editService(${
                                  service.id
                                })" title="Edit"><i class="bi bi-pencil"></i></button>
                                <button class="btn btn-outline-danger" onclick="AddonServicesPage.deleteService(${
                                  service.id
                                }, '${
          service.service_name
        }')" title="Delete"><i class="bi bi-trash"></i></button>
                            </div>
                        </td>
                    </tr>
                `;
        tbody.append(row);
      });

      $("#servicesRecordCount").html(
        `<small>Showing ${pagination.from} to ${pagination.to} of ${pagination.total} records</small>`
      );
      AOS.refresh();
    },

    renderPagination: function (type, pagination) {
      const container = $(`#${type}PaginationContainer`);
      container.empty();
      if (pagination.total_pages <= 1) return;

      const prevDisabled = pagination.current_page === 1 ? "disabled" : "";
      container.append(
        `<li class="page-item ${prevDisabled}"><a class="page-link" href="#" onclick="AddonServicesPage.goToPage('${type}', ${
          pagination.current_page - 1
        }); return false;"><i class="bi bi-chevron-left"></i></a></li>`
      );

      for (let i = 1; i <= pagination.total_pages; i++) {
        if (
          i === 1 ||
          i === pagination.total_pages ||
          (i >= pagination.current_page - 1 && i <= pagination.current_page + 1)
        ) {
          const active = i === pagination.current_page ? "active" : "";
          container.append(
            `<li class="page-item ${active}"><a class="page-link" href="#" onclick="AddonServicesPage.goToPage('${type}', ${i}); return false;">${i}</a></li>`
          );
        } else if (
          i === pagination.current_page - 2 ||
          i === pagination.current_page + 2
        ) {
          container.append(
            `<li class="page-item disabled"><span class="page-link">...</span></li>`
          );
        }
      }

      const nextDisabled =
        pagination.current_page === pagination.total_pages ? "disabled" : "";
      container.append(
        `<li class="page-item ${nextDisabled}"><a class="page-link" href="#" onclick="AddonServicesPage.goToPage('${type}', ${
          pagination.current_page + 1
        }); return false;"><i class="bi bi-chevron-right"></i></a></li>`
      );
      $(`#${type}PaginationInfo`).html(
        `<small>Page ${pagination.current_page} of ${pagination.total_pages}</small>`
      );
    },

    goToPage: function (type, page) {
      if (type === "groups") {
        if (page < 1 || page > this.groupsTotalPages) return;
        this.groupsCurrentPage = page;
        this.loadGroups();
      } else {
        if (page < 1 || page > this.servicesTotalPages) return;
        this.servicesCurrentPage = page;
        this.loadServices();
      }
      $("html, body").animate({ scrollTop: 0 }, 400);
    },

    updatePriceDisplay: function () {
      const internal = parseFloat($("#internalAmount").val()) || 0;
      const external = parseFloat($("#externalAmount").val()) || 0;
      const diff = external - internal;

      $("#displayInternalPrice").text(`RM ${internal.toFixed(2)}`);
      $("#displayExternalPrice").text(`RM ${external.toFixed(2)}`);
      $("#displayPriceDiff").text(
        `${diff >= 0 ? "+" : ""}RM ${diff.toFixed(2)}`
      );
      gsap.fromTo(
        "#displayPriceDiff",
        { scale: 1.2, color: diff >= 0 ? "#ffc107" : "#dc3545" },
        { scale: 1, color: "#ffc107", duration: 0.5 }
      );
    },

    openGroupModal: function (isEdit, groupId = null) {
      this.editMode = isEdit;
      this.editId = groupId;

      if (isEdit) {
        $("#groupModalTitle").text("Edit Group / 编辑组");
        $("#btnSaveGroupText").text("Update / 更新");
        this.loadGroupData(groupId);
      } else {
        $("#groupModalTitle").text("Add New Group / 添加新组");
        $("#btnSaveGroupText").text("Save / 保存");
        $("#groupForm")[0].reset();
      }

      const modal = new bootstrap.Modal(document.getElementById("groupModal"));
      modal.show();
    },

    loadGroupData: function (id) {
      const self = this;
      TempleAPI.get("/hall-booking/addon-groups/" + id).done(function (
        response
      ) {
        if (response.success) {
          const group = response.data;
          $("#groupName").val(group.group_name);
          $("#groupNameChinese").val(group.group_name_chinese);
          $("#groupIcon").val(group.icon);
          $("#displayOrder").val(group.display_order);
          $("#groupDescription").val(group.description);
          $("#groupDescriptionChinese").val(group.description_chinese);
          $(`input[name="groupStatus"][value="${group.status}"]`)
            .prop("checked", true)
            .trigger("change");
        }
      });
    },

    saveGroup: function () {
      const self = this;
      const form = document.getElementById("groupForm");

      if (!form.checkValidity()) {
        form.classList.add("was-validated");
        TempleCore.showToast("Please fill required fields", "warning");
        return;
      }

      const formData = {
        group_name: $("#groupName").val(),
        group_name_chinese: $("#groupNameChinese").val(),
        icon: $("#groupIcon").val(),
        display_order: parseInt($("#displayOrder").val()) || 0,
        description: $("#groupDescription").val(),
        description_chinese: $("#groupDescriptionChinese").val(),
        status: parseInt($('input[name="groupStatus"]:checked').val()),
      };

      $("#btnSaveGroup")
        .prop("disabled", true)
        .html(
          '<span class="spinner-border spinner-border-sm"></span> Saving...'
        );

      const apiCall = this.editMode
        ? TempleAPI.put("/hall-booking/addon-groups/" + this.editId, formData)
        : TempleAPI.post("/hall-booking/addon-groups", formData);

      apiCall
        .done(function (response) {
          if (response.success) {
            TempleCore.showToast(
              self.editMode ? "Group updated" : "Group created",
              "success"
            );
            bootstrap.Modal.getInstance(
              document.getElementById("groupModal")
            ).hide();
            self.loadGroups();
            self.loadAddonGroups();
          } else {
            TempleCore.showToast(response.message || "Failed to save", "error");
          }
        })
        .fail(function () {
          TempleCore.showToast("Error saving group", "error");
        })
        .always(function () {
          $("#btnSaveGroup")
            .prop("disabled", false)
            .html(
              '<i class="bi bi-check-circle"></i> ' +
                $("#btnSaveGroupText").text()
            );
        });
    },

    editGroup: function (id) {
      this.openGroupModal(true, id);
    },

    deleteGroup: function (id, name) {
      const self = this;
      Swal.fire({
        title: "Delete Group?",
        html: `Delete <strong>${name}</strong>?<br><small>确定要删除此组吗？</small>`,
        icon: "warning",
        showCancelButton: true,
        confirmButtonColor: "#dc3545",
        confirmButtonText: "Delete / 删除",
        cancelButtonText: "Cancel / 取消",
      }).then((result) => {
        if (result.isConfirmed) {
          TempleAPI.delete("/hall-booking/addon-groups/" + id).done(function (
            response
          ) {
            if (response.success) {
              TempleCore.showToast("Group deleted", "success");
              self.loadGroups();
              self.loadAddonGroups();
            } else {
              TempleCore.showToast(
                response.message || "Failed to delete",
                "error"
              );
            }
          });
        }
      });
    },

    openServiceModal: function (isEdit, serviceId = null) {
      this.editMode = isEdit;
      this.editId = serviceId;

      if (isEdit) {
        $("#serviceModalTitle").text("Edit Service / 编辑服务");
        $("#btnSaveServiceText").text("Update / 更新");
        this.loadServiceData(serviceId);
      } else {
        $("#serviceModalTitle").text("Add New Service / 添加新服务");
        $("#btnSaveServiceText").text("Save / 保存");
        $("#serviceForm")[0].reset();
        this.updatePriceDisplay();
      }

      const modal = new bootstrap.Modal(
        document.getElementById("serviceModal")
      );
      modal.show();
    },

    loadServiceData: function (id) {
      const self = this;
      TempleAPI.get("/hall-booking/addon-services/" + id).done(function (
        response
      ) {
        if (response.success) {
          const service = response.data;
          $("#serviceGroupId").val(service.addon_group_id);
          $("#serviceName").val(service.service_name);
          $("#serviceNameChinese").val(service.service_name_chinese);
          $("#internalAmount").val(service.internal_amount);
          $("#externalAmount").val(service.external_amount);
          $("#serviceUnit").val(service.unit);
          $("#serviceDescription").val(service.description);
          $("#serviceDescriptionChinese").val(service.description_chinese);
          $(`input[name="serviceStatus"][value="${service.status}"]`).prop(
            "checked",
            true
          );
          self.updatePriceDisplay();
        }
      });
    },

    saveService: function () {
      const self = this;
      const form = document.getElementById("serviceForm");

      if (!form.checkValidity()) {
        form.classList.add("was-validated");
        TempleCore.showToast("Please fill required fields", "warning");
        return;
      }

      const formData = {
        addon_group_id: parseInt($("#serviceGroupId").val()),
        service_name: $("#serviceName").val(),
        service_name_chinese: $("#serviceNameChinese").val(),
        internal_amount: parseFloat($("#internalAmount").val()),
        external_amount: parseFloat($("#externalAmount").val()),
        unit: $("#serviceUnit").val(),
        description: $("#serviceDescription").val(),
        description_chinese: $("#serviceDescriptionChinese").val(),
        status: parseInt($('input[name="serviceStatus"]:checked').val()),
      };

      $("#btnSaveService")
        .prop("disabled", true)
        .html(
          '<span class="spinner-border spinner-border-sm"></span> Saving...'
        );

      const apiCall = this.editMode
        ? TempleAPI.put("/hall-booking/addon-services/" + this.editId, formData)
        : TempleAPI.post("/hall-booking/addon-services", formData);

      apiCall
        .done(function (response) {
          if (response.success) {
            TempleCore.showToast(
              self.editMode ? "Service updated" : "Service created",
              "success"
            );
            bootstrap.Modal.getInstance(
              document.getElementById("serviceModal")
            ).hide();
            self.loadServices();
          } else {
            TempleCore.showToast(response.message || "Failed to save", "error");
          }
        })
        .fail(function () {
          TempleCore.showToast("Error saving service", "error");
        })
        .always(function () {
          $("#btnSaveService")
            .prop("disabled", false)
            .html(
              '<i class="bi bi-check-circle"></i> ' +
                $("#btnSaveServiceText").text()
            );
        });
    },

    editService: function (id) {
      this.openServiceModal(true, id);
    },

    deleteService: function (id, name) {
      const self = this;
      Swal.fire({
        title: "Delete Service?",
        html: `Delete <strong>${name}</strong>?<br><small>确定要删除此服务吗？</small>`,
        icon: "warning",
        showCancelButton: true,
        confirmButtonColor: "#dc3545",
        confirmButtonText: "Delete / 删除",
        cancelButtonText: "Cancel / 取消",
      }).then((result) => {
        if (result.isConfirmed) {
          TempleAPI.delete("/hall-booking/addon-services/" + id).done(function (
            response
          ) {
            if (response.success) {
              TempleCore.showToast("Service deleted", "success");
              self.loadServices();
            } else {
              TempleCore.showToast(
                response.message || "Failed to delete",
                "error"
              );
            }
          });
        }
      });
    },

    destroy: function () {
      AOS.refreshHard();
    },
  };
})(jQuery, window);
