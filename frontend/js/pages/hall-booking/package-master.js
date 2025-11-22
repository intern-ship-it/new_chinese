// frontend/js/pages/hall-booking/package-master.js
// Complete Package Master with TempleAPI and Chinese translations

(function ($, window) {
  "use strict";

  window.PackageMasterPage = {
    currentUser: null,
    packagesData: [],
    currentPage: 1,
    perPage: 10,
    totalPages: 1,
    filters: {
      search: "",
      status: "",
    },
    editMode: false,
    editId: null,

    // Initialize page
    init: function () {
      this.currentUser = JSON.parse(
        localStorage.getItem(window.APP_CONFIG.STORAGE.USER) || "{}"
      );
      this.render();
      this.bindEvents();
      this.initAnimations();
      this.loadPackages();
    },

    // Render page HTML
    render: function () {
      const html = `
                <!-- Page Header with Animation -->
                <div class="package-header-bg" style="background: linear-gradient(135deg, #4facfe 0%, #00f2fe 100%); padding: 2rem 0; margin-bottom: 2rem; border-radius: 15px; position: relative; overflow: hidden;">
                    <div class="container">
                        <div class="row align-items-center">
                            <div class="col-md-8" data-aos="fade-right">
                                <div class="d-flex align-items-center">
                                    <div class="package-header-icon" style="background: rgba(255,255,255,0.2); width: 70px; height: 70px; border-radius: 15px; display: flex; align-items: center; justify-content: center; margin-right: 1.5rem;">
                                        <i class="bi bi-box-seam" style="font-size: 2rem; color: white;"></i>
                                    </div>
                                    <div>
                                        <h2 class="mb-0 text-white">Package Master</h2>
                                        <p class="mb-0 text-white-50">套餐管理</p>
                                        <small class="text-white-75">Manage booking packages based on number of people</small>
                                    </div>
                                </div>
                            </div>
                            <div class="col-md-4 text-end" data-aos="fade-left">
                                <button class="btn btn-light btn-lg" id="btnAddPackage">
                                    <i class="bi bi-plus-circle"></i> Add New Package
                                    <br><small>添加新套餐</small>
                                </button>
                            </div>
                        </div>
                    </div>
                </div>

                <!-- Filters Section -->
                <div class="container mb-4">
                    <div class="card border-0 shadow-sm" data-aos="fade-up">
                        <div class="card-body">
                            <div class="row g-3">
                                <div class="col-md-6">
                                    <label class="form-label">
                                        <i class="bi bi-search"></i> Search Package
                                        <span class="text-muted">/ 搜索套餐</span>
                                    </label>
                                    <input type="text" class="form-control" id="searchInput" placeholder="Search by name...">
                                </div>
                                <div class="col-md-3">
                                    <label class="form-label">
                                        <i class="bi bi-funnel"></i> Status
                                        <span class="text-muted">/ 状态</span>
                                    </label>
                                    <select class="form-select" id="statusFilter">
                                        <option value="">All Status / 所有状态</option>
                                        <option value="1">Active / 活跃</option>
                                        <option value="0">Inactive / 非活跃</option>
                                    </select>
                                </div>
                                <div class="col-md-3 d-flex align-items-end">
                                    <button class="btn btn-outline-secondary w-100" id="btnClearFilter">
                                        <i class="bi bi-x-circle"></i> Clear Filters / 清除筛选
                                    </button>
                                </div>
                            </div>
                        </div>
                    </div>
                </div>

                <!-- Packages Grid View -->
                <div class="container">
                    <!-- Table View Card -->
                    <div class="card border-0 shadow-sm mb-4" data-aos="fade-up" data-aos-delay="100">
                        <div class="card-header bg-white border-0 py-3">
                            <div class="d-flex justify-content-between align-items-center">
                                <h5 class="mb-0">
                                    <i class="bi bi-list-ul text-primary"></i> Packages List / 套餐列表
                                </h5>
                                <div class="text-muted" id="recordCount">
                                    <small>Loading...</small>
                                </div>
                            </div>
                        </div>
                        <div class="card-body p-0">
                            <div class="table-responsive">
                                <table class="table table-hover mb-0" id="packagesTable">
                                    <thead class="table-light">
                                        <tr>
                                            <th width="5%">#</th>
                                            <th width="25%">Package Name / 套餐名称</th>
                                            <th width="12%">People / 人数</th>
                                            <th width="15%">Total Amount / 总金额</th>
                                            <th width="15%">Per Person / 每人</th>
                                            <th width="10%">Status / 状态</th>
                                            <th width="18%" class="text-center">Actions / 操作</th>
                                        </tr>
                                    </thead>
                                    <tbody id="packagesTableBody">
                                        <tr>
                                            <td colspan="7" class="text-center py-5">
                                                <div class="spinner-border text-primary" role="status">
                                                    <span class="visually-hidden">Loading...</span>
                                                </div>
                                                <p class="mt-2 text-muted">Loading packages...</p>
                                            </td>
                                        </tr>
                                    </tbody>
                                </table>
                            </div>
                        </div>
                        <div class="card-footer bg-white border-0">
                            <div class="d-flex justify-content-between align-items-center">
                                <div id="paginationInfo" class="text-muted">
                                    <small>Showing 0 of 0 records</small>
                                </div>
                                <nav>
                                    <ul class="pagination pagination-sm mb-0" id="paginationContainer">
                                        <!-- Pagination buttons will be rendered here -->
                                    </ul>
                                </nav>
                            </div>
                        </div>
                    </div>
                </div>

                <!-- Add/Edit Package Modal -->
                <div class="modal fade" id="packageModal" tabindex="-1">
                    <div class="modal-dialog modal-lg modal-dialog-centered modal-dialog-scrollable">
                        <div class="modal-content">
                            <div class="modal-header bg-gradient-primary text-white">
                                <h5 class="modal-title" id="modalTitle">
                                    <i class="bi bi-box-seam"></i> <span id="modalTitleText">Add New Package</span>
                                </h5>
                                <button type="button" class="btn-close btn-close-white" data-bs-dismiss="modal"></button>
                            </div>
                            <div class="modal-body">
                                <form id="packageForm">
                                    <div class="row g-3">
                                        <!-- Package Name (English) -->
                                        <div class="col-md-6">
                                            <label class="form-label required">
                                                Package Name (English) <span class="text-danger">*</span>
                                            </label>
                                            <input type="text" class="form-control" id="packageName" name="package_name" required placeholder="e.g., Small Group Package">
                                            <div class="invalid-feedback">Please enter package name</div>
                                        </div>

                                        <!-- Package Name (Chinese) -->
                                        <div class="col-md-6">
                                            <label class="form-label">
                                                Package Name (Chinese) / 套餐名称
                                            </label>
                                            <input type="text" class="form-control" id="packageNameChinese" name="package_name_chinese" placeholder="例如：小团体套餐">
                                        </div>

                                        <!-- Number of People -->
                                        <div class="col-md-6">
                                            <label class="form-label required">
                                                <i class="bi bi-people-fill"></i> Number of People / 人数 <span class="text-danger">*</span>
                                            </label>
                                            <select class="form-select" id="numberOfPeople" name="number_of_people" required>
                                                <option value="">Select Number / 选择人数</option>
                                                <option value="10">10 People</option>
                                                <option value="20">20 People</option>
                                                <option value="30">30 People</option>
                                                <option value="50">50 People</option>
                                                <option value="75">75 People</option>
                                                <option value="100">100 People</option>
                                                <option value="150">150 People</option>
                                                <option value="200">200 People</option>
                                                <option value="300">300 People</option>
                                                <option value="500">500 People</option>
                                            </select>
                                            <div class="invalid-feedback">Please select number of people</div>
                                        </div>

                                        <!-- Amount -->
                                        <div class="col-md-6">
                                            <label class="form-label required">
                                                <i class="bi bi-currency-dollar"></i> Total Amount (RM) / 总金额 <span class="text-danger">*</span>
                                            </label>
                                            <div class="input-group">
                                                <span class="input-group-text">RM</span>
                                                <input type="number" step="0.01" class="form-control" id="amount" name="amount" required min="0" placeholder="0.00">
                                            </div>
                                            <small class="text-muted" id="perPersonPrice">Per person: RM 0.00</small>
                                            <div class="invalid-feedback">Please enter amount</div>
                                        </div>

                                        <!-- Description (English) -->
                                        <div class="col-12">
                                            <label class="form-label">
                                                Description (English)
                                            </label>
                                            <textarea class="form-control" id="description" name="description" rows="2" placeholder="Brief description of the package..."></textarea>
                                        </div>

                                        <!-- Description (Chinese) -->
                                        <div class="col-12">
                                            <label class="form-label">
                                                Description (Chinese) / 描述
                                            </label>
                                            <textarea class="form-control" id="descriptionChinese" name="description_chinese" rows="2" placeholder="套餐描述..."></textarea>
                                        </div>

                                        <!-- What's Included (English) -->
                                        <div class="col-12">
                                            <label class="form-label">
                                                <i class="bi bi-check2-all"></i> What's Included (English)
                                            </label>
                                            <textarea class="form-control" id="includes" name="includes" rows="3" placeholder="e.g., Tables, Chairs, Sound System, Decorations..."></textarea>
                                            <small class="text-muted">List all items/services included in this package</small>
                                        </div>

                                        <!-- What's Included (Chinese) -->
                                        <div class="col-12">
                                            <label class="form-label">
                                                What's Included (Chinese) / 包含内容
                                            </label>
                                            <textarea class="form-control" id="includesChinese" name="includes_chinese" rows="3" placeholder="例如：桌子、椅子、音响系统、装饰..."></textarea>
                                        </div>

                                        <!-- Status -->
                                        <div class="col-12">
                                            <label class="form-label required">
                                                Status / 状态 <span class="text-danger">*</span>
                                            </label>
                                            <div class="row g-3">
                                                <div class="col-md-6">
                                                    <div class="form-check-card p-3 border rounded">
                                                        <input class="form-check-input" type="radio" name="status" id="statusActive" value="1" checked>
                                                        <label class="form-check-label w-100" for="statusActive">
                                                            <div class="d-flex align-items-center">
                                                                <i class="bi bi-check-circle-fill text-success fs-4 me-2"></i>
                                                                <div>
                                                                    <strong>Active / 活跃</strong>
                                                                    <br><small class="text-muted">Available for booking</small>
                                                                </div>
                                                            </div>
                                                        </label>
                                                    </div>
                                                </div>
                                                <div class="col-md-6">
                                                    <div class="form-check-card p-3 border rounded">
                                                        <input class="form-check-input" type="radio" name="status" id="statusInactive" value="0">
                                                        <label class="form-check-label w-100" for="statusInactive">
                                                            <div class="d-flex align-items-center">
                                                                <i class="bi bi-x-circle-fill text-danger fs-4 me-2"></i>
                                                                <div>
                                                                    <strong>Inactive / 非活跃</strong>
                                                                    <br><small class="text-muted">Not available</small>
                                                                </div>
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
                                <button type="button" class="btn btn-primary" id="btnSavePackage">
                                    <i class="bi bi-check-circle"></i> <span id="btnSaveText">Save Package / 保存</span>
                                </button>
                            </div>
                        </div>
                    </div>
                </div>
            `;

      $("#page-container").html(html);
    },

    // Initialize animations
    initAnimations: function () {
      AOS.init({
        duration: 800,
        easing: "ease-out-cubic",
        once: true,
        offset: 100,
      });

      gsap.to(".package-header-bg", {
        backgroundPosition: "100% 50%",
        duration: 20,
        repeat: -1,
        yoyo: true,
        ease: "none",
      });

      gsap.to(".package-header-icon", {
        y: -10,
        duration: 2,
        repeat: -1,
        yoyo: true,
        ease: "power1.inOut",
      });
    },

    // Bind events
    bindEvents: function () {
      const self = this;

      $("#btnAddPackage").on("click", function () {
        self.openModal(false);
      });

      $("#btnSavePackage").on("click", function () {
        self.savePackage();
      });

      let searchTimeout;
      $("#searchInput").on("input", function () {
        clearTimeout(searchTimeout);
        searchTimeout = setTimeout(function () {
          self.filters.search = $("#searchInput").val();
          self.currentPage = 1;
          self.loadPackages();
        }, 500);
      });

      $("#statusFilter").on("change", function () {
        self.filters.status = $(this).val();
        self.currentPage = 1;
        self.loadPackages();
      });

      $("#btnClearFilter").on("click", function () {
        self.clearFilters();
      });

      $("#numberOfPeople, #amount").on("change input", function () {
        self.calculatePerPersonPrice();
      });

      $(document).on(
        "change",
        'input[type="radio"][name="status"]',
        function () {
          const $parent = $(this).closest(".form-check-card");
          const $siblings = $parent
            .parent()
            .siblings()
            .find(".form-check-card");

          gsap.to($parent[0], {
            scale: 1.05,
            boxShadow: "0 8px 20px rgba(79, 172, 254, 0.3)",
            borderColor: "#4facfe",
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
      );

      $(document)
        .on("focus", ".form-control, .form-select", function () {
          gsap.to($(this), {
            scale: 1.02,
            duration: 0.2,
            ease: "power1.out",
          });
        })
        .on("blur", ".form-control, .form-select", function () {
          gsap.to($(this), {
            scale: 1,
            duration: 0.2,
          });
        });
    },

    calculatePerPersonPrice: function () {
      const people = parseInt($("#numberOfPeople").val()) || 0;
      const amount = parseFloat($("#amount").val()) || 0;

      if (people > 0 && amount > 0) {
        const perPerson = amount / people;
        $("#perPersonPrice").html(
          `Per person: <strong class="text-success">RM ${perPerson.toFixed(
            2
          )}</strong>`
        );

        gsap.fromTo(
          "#perPersonPrice",
          { scale: 1.2, color: "#28a745" },
          { scale: 1, color: "#6c757d", duration: 0.5, ease: "back.out(1.7)" }
        );
      } else {
        $("#perPersonPrice").html("Per person: RM 0.00");
      }
    },

    clearFilters: function () {
      this.filters = {
        search: "",
        status: "",
      };
      $("#searchInput").val("");
      $("#statusFilter").val("");
      this.currentPage = 1;
      this.loadPackages();

      TempleCore.showToast("Filters cleared", "info");
    },

    loadPackages: function () {
      const self = this;

      const params = {
        page: this.currentPage,
        per_page: this.perPage,
        search: this.filters.search,
        status: this.filters.status,
      };

      TempleAPI.get("/hall-booking/package-master", params)
        .done(function (response) {
          if (response.success) {
            self.packagesData = response.data;
            self.totalPages = response.pagination.total_pages;
            self.renderPackagesTable(response.data, response.pagination);
            self.renderPagination(response.pagination);
          } else {
            TempleCore.showToast("Failed to load packages", "error");
          }
        })
        .fail(function (error) {
          console.error("Error loading packages:", error);
          TempleCore.showToast("Error loading packages", "error");
          $("#packagesTableBody").html(`
                        <tr>
                            <td colspan="7" class="text-center py-5 text-danger">
                                <i class="bi bi-exclamation-triangle fs-1"></i>
                                <p class="mt-2">Failed to load packages. Please try again.</p>
                            </td>
                        </tr>
                    `);
        });
    },

    renderPackagesTable: function (packages, pagination) {
      const tbody = $("#packagesTableBody");
      tbody.empty();

      if (packages.length === 0) {
        tbody.html(`
                    <tr>
                        <td colspan="7" class="text-center py-5">
                            <i class="bi bi-inbox fs-1 text-muted"></i>
                            <p class="mt-2 text-muted">No packages found / 未找到套餐</p>
                        </td>
                    </tr>
                `);
        $("#recordCount").html("<small>0 records</small>");
        return;
      }

      packages.forEach((pkg, index) => {
        const rowNumber =
          (pagination.current_page - 1) * pagination.per_page + index + 1;
        const statusBadge =
          pkg.status === 1
            ? '<span class="badge bg-success">Active / 活跃</span>'
            : '<span class="badge bg-danger">Inactive / 非活跃</span>';

        const row = `
                    <tr data-aos="fade-up" data-aos-delay="${index * 50}">
                        <td>${rowNumber}</td>
                        <td>
                            <strong>${pkg.package_name}</strong>
                            ${
                              pkg.package_name_chinese
                                ? `<br><small class="text-muted">${pkg.package_name_chinese}</small>`
                                : ""
                            }
                        </td>
                        <td>
                            <span class="badge bg-primary" style="font-size: 0.9rem;">
                                <i class="bi bi-people-fill"></i> ${
                                  pkg.number_of_people
                                } People
                            </span>
                        </td>
                        <td>
                            <strong class="text-success">${
                              pkg.amount_formatted
                            }</strong>
                        </td>
                        <td>
                            <span class="text-info">${
                              pkg.price_per_person
                            }</span>
                            <br><small class="text-muted">per person</small>
                        </td>
                        <td>${statusBadge}</td>
                        <td class="text-center">
                            <div class="btn-group btn-group-sm">
                                <button class="btn btn-outline-primary" onclick="PackageMasterPage.editPackage(${
                                  pkg.id
                                })" title="Edit">
                                    <i class="bi bi-pencil"></i>
                                </button>
                                <button class="btn btn-outline-danger" onclick="PackageMasterPage.deletePackage(${
                                  pkg.id
                                }, '${pkg.package_name}')" title="Delete">
                                    <i class="bi bi-trash"></i>
                                </button>
                            </div>
                        </td>
                    </tr>
                `;
        tbody.append(row);
      });

      $("#recordCount").html(`
                <small>Showing ${pagination.from} to ${pagination.to} of ${pagination.total} records</small>
            `);

      AOS.refresh();
    },

    renderPagination: function (pagination) {
      const container = $("#paginationContainer");
      container.empty();

      if (pagination.total_pages <= 1) {
        return;
      }

      const prevDisabled = pagination.current_page === 1 ? "disabled" : "";
      container.append(`
                <li class="page-item ${prevDisabled}">
                    <a class="page-link" href="#" onclick="PackageMasterPage.goToPage(${
                      pagination.current_page - 1
                    }); return false;">
                        <i class="bi bi-chevron-left"></i>
                    </a>
                </li>
            `);

      for (let i = 1; i <= pagination.total_pages; i++) {
        if (
          i === 1 ||
          i === pagination.total_pages ||
          (i >= pagination.current_page - 1 && i <= pagination.current_page + 1)
        ) {
          const active = i === pagination.current_page ? "active" : "";
          container.append(`
                        <li class="page-item ${active}">
                            <a class="page-link" href="#" onclick="PackageMasterPage.goToPage(${i}); return false;">${i}</a>
                        </li>
                    `);
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
      container.append(`
                <li class="page-item ${nextDisabled}">
                    <a class="page-link" href="#" onclick="PackageMasterPage.goToPage(${
                      pagination.current_page + 1
                    }); return false;">
                        <i class="bi bi-chevron-right"></i>
                    </a>
                </li>
            `);

      $("#paginationInfo").html(`
                <small>Page ${pagination.current_page} of ${pagination.total_pages} (${pagination.total} total records)</small>
            `);
    },

    goToPage: function (page) {
      if (page < 1 || page > this.totalPages) return;
      this.currentPage = page;
      this.loadPackages();

      $("html, body").animate({ scrollTop: 0 }, 400);
    },

    openModal: function (isEdit, packageId = null) {
      this.editMode = isEdit;
      this.editId = packageId;

      if (isEdit) {
        $("#modalTitleText").text("Edit Package / 编辑套餐");
        $("#btnSaveText").text("Update Package / 更新");
        this.loadPackageData(packageId);
      } else {
        $("#modalTitleText").text("Add New Package / 添加新套餐");
        $("#btnSaveText").text("Save Package / 保存");
        $("#packageForm")[0].reset();
        $("#packageForm").removeClass("was-validated");
        $("#perPersonPrice").html("Per person: RM 0.00");
      }

      const modal = new bootstrap.Modal(
        document.getElementById("packageModal")
      );
      modal.show();

      $("#packageModal").on("shown.bs.modal", function () {
        gsap.from("#packageForm .row > div", {
          opacity: 0,
          y: 20,
          stagger: 0.05,
          duration: 0.4,
          ease: "power2.out",
        });
      });
    },

    loadPackageData: function (id) {
      const self = this;

      TempleAPI.get("/hall-booking/package-master/" + id)
        .done(function (response) {
          if (response.success) {
            const pkg = response.data;
            $("#packageName").val(pkg.package_name);
            $("#packageNameChinese").val(pkg.package_name_chinese);
            $("#numberOfPeople").val(pkg.number_of_people);
            $("#amount").val(pkg.amount);
            $("#description").val(pkg.description);
            $("#descriptionChinese").val(pkg.description_chinese);
            $("#includes").val(pkg.includes);
            $("#includesChinese").val(pkg.includes_chinese);
            $(`input[name="status"][value="${pkg.status}"]`)
              .prop("checked", true)
              .trigger("change");

            self.calculatePerPersonPrice();
          } else {
            TempleCore.showToast("Failed to load package data", "error");
          }
        })
        .fail(function (error) {
          console.error("Error loading package:", error);
          TempleCore.showToast("Error loading package data", "error");
        });
    },

    savePackage: function () {
      const self = this;
      const form = document.getElementById("packageForm");

      if (!form.checkValidity()) {
        form.classList.add("was-validated");
        TempleCore.showToast("Please fill in all required fields", "warning");
        return;
      }

      const formData = {
        package_name: $("#packageName").val(),
        package_name_chinese: $("#packageNameChinese").val(),
        number_of_people: parseInt($("#numberOfPeople").val()),
        amount: parseFloat($("#amount").val()),
        description: $("#description").val(),
        description_chinese: $("#descriptionChinese").val(),
        includes: $("#includes").val(),
        includes_chinese: $("#includesChinese").val(),
        status: parseInt($('input[name="status"]:checked').val()),
      };

      $("#btnSavePackage")
        .prop("disabled", true)
        .html(
          '<span class="spinner-border spinner-border-sm me-2"></span>Saving...'
        );

      const apiCall = this.editMode
        ? TempleAPI.put("/hall-booking/package-master/" + this.editId, formData)
        : TempleAPI.post("/hall-booking/package-master", formData);

      apiCall
        .done(function (response) {
          if (response.success) {
            TempleCore.showToast(
              self.editMode
                ? "Package updated successfully"
                : "Package created successfully",
              "success"
            );
            bootstrap.Modal.getInstance(
              document.getElementById("packageModal")
            ).hide();
            self.loadPackages();
          } else {
            TempleCore.showToast(
              response.message || "Failed to save package",
              "error"
            );
          }
        })
        .fail(function (error) {
          console.error("Error saving package:", error);
          TempleCore.showToast("Error saving package", "error");
        })
        .always(function () {
          $("#btnSavePackage")
            .prop("disabled", false)
            .html(
              '<i class="bi bi-check-circle"></i> ' + $("#btnSaveText").text()
            );
        });
    },

    editPackage: function (id) {
      this.openModal(true, id);
    },

    deletePackage: function (id, packageName) {
      const self = this;

      Swal.fire({
        title: "Delete Package?",
        html: `Are you sure you want to delete <strong>${packageName}</strong>?<br><small class="text-muted">确定要删除此套餐吗？</small>`,
        icon: "warning",
        showCancelButton: true,
        confirmButtonColor: "#dc3545",
        cancelButtonColor: "#6c757d",
        confirmButtonText: "Yes, delete it! / 是的，删除",
        cancelButtonText: "Cancel / 取消",
      }).then((result) => {
        if (result.isConfirmed) {
          TempleAPI.delete("/hall-booking/package-master/" + id)
            .done(function (response) {
              if (response.success) {
                TempleCore.showToast("Package deleted successfully", "success");
                self.loadPackages();
              } else {
                TempleCore.showToast(
                  response.message || "Failed to delete package",
                  "error"
                );
              }
            })
            .fail(function (error) {
              console.error("Error deleting package:", error);
              TempleCore.showToast("Error deleting package", "error");
            });
        }
      });
    },

    destroy: function () {
      AOS.refreshHard();
    },
  };
})(jQuery, window);
