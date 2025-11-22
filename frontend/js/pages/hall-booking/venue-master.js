// frontend/js/pages/hall-booking/venue-master.js

(function ($, window) {
  "use strict";

  window.VenueMasterPage = {
    currentUser: null,
    venuesData: [],
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
      this.loadVenues();
    },

    // Render page HTML
    render: function () {
      const html = `
                <!-- Page Header with Animation -->
                <div class="venue-header-bg" style="background: linear-gradient(135deg, #667eea 0%, #764ba2 100%); padding: 2rem 0; margin-bottom: 2rem; border-radius: 15px; position: relative; overflow: hidden;">
                    <div class="container">
                        <div class="row align-items-center">
                            <div class="col-md-8" data-aos="fade-right">
                                <div class="d-flex align-items-center">
                                    <div class="venue-header-icon" style="background: rgba(255,255,255,0.2); width: 70px; height: 70px; border-radius: 15px; display: flex; align-items: center; justify-content: center; margin-right: 1.5rem;">
                                        <i class="bi bi-building" style="font-size: 2rem; color: white;"></i>
                                    </div>
                                    <div>
                                        <h2 class="mb-0 text-white">Venue Master</h2>
                                        <p class="mb-0 text-white-50">场地管理</p>
                                        <small class="text-white-75">Manage venue details and settings</small>
                                    </div>
                                </div>
                            </div>
                            <div class="col-md-4 text-end" data-aos="fade-left">
                                <button class="btn btn-light btn-lg" id="btnAddVenue">
                                    <i class="bi bi-plus-circle"></i> Add New Venue
                                    <br><small>添加新场地</small>
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
                                        <i class="bi bi-search"></i> Search Venue
                                        <span class="text-muted">/ 搜索场地</span>
                                    </label>
                                    <input type="text" class="form-control" id="searchInput" placeholder="Search by name, location...">
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

                <!-- Venues Table -->
                <div class="container">
                    <div class="card border-0 shadow-sm" data-aos="fade-up" data-aos-delay="100">
                        <div class="card-header bg-white border-0 py-3">
                            <div class="d-flex justify-content-between align-items-center">
                                <h5 class="mb-0">
                                    <i class="bi bi-list-ul text-primary"></i> Venues List / 场地列表
                                </h5>
                                <div class="text-muted" id="recordCount">
                                    <small>Loading...</small>
                                </div>
                            </div>
                        </div>
                        <div class="card-body p-0">
                            <div class="table-responsive">
                                <table class="table table-hover mb-0" id="venuesTable">
                                    <thead class="table-light">
                                        <tr>
                                            <th width="5%">#</th>
                                            <th width="20%">Venue Name / 场地名称</th>
                                            <th width="15%">Location / 位置</th>
                                            <th width="10%">Capacity / 容量</th>
                                            <th width="10%">Area (sqft) / 面积</th>
                                            <th width="15%">Facilities / 设施</th>
                                            <th width="10%">Status / 状态</th>
                                            <th width="15%" class="text-center">Actions / 操作</th>
                                        </tr>
                                    </thead>
                                    <tbody id="venuesTableBody">
                                        <tr>
                                            <td colspan="8" class="text-center py-5">
                                                <div class="spinner-border text-primary" role="status">
                                                    <span class="visually-hidden">Loading...</span>
                                                </div>
                                                <p class="mt-2 text-muted">Loading venues...</p>
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

                <!-- Add/Edit Venue Modal -->
                <div class="modal fade" id="venueModal" tabindex="-1">
                    <div class="modal-dialog modal-lg modal-dialog-centered modal-dialog-scrollable">
                        <div class="modal-content">
                            <div class="modal-header bg-gradient-primary text-white">
                                <h5 class="modal-title" id="modalTitle">
                                    <i class="bi bi-building"></i> <span id="modalTitleText">Add New Venue</span>
                                </h5>
                                <button type="button" class="btn-close btn-close-white" data-bs-dismiss="modal"></button>
                            </div>
                            <div class="modal-body">
                                <form id="venueForm">
                                    <div class="row g-3">
                                        <!-- Venue Name (English) -->
                                        <div class="col-md-6">
                                            <label class="form-label required">
                                                Venue Name (English) <span class="text-danger">*</span>
                                            </label>
                                            <input type="text" class="form-control" id="venueName" name="venue_name" required>
                                            <div class="invalid-feedback">Please enter venue name</div>
                                        </div>

                                        <!-- Venue Name (Chinese) -->
                                        <div class="col-md-6">
                                            <label class="form-label">
                                                Venue Name (Chinese) / 场地名称（中文）
                                            </label>
                                            <input type="text" class="form-control" id="venueNameChinese" name="venue_name_chinese">
                                        </div>

                                        <!-- Location -->
                                        <div class="col-12">
                                            <label class="form-label">
                                                Location / 位置
                                            </label>
                                            <input type="text" class="form-control" id="location" name="location" placeholder="Building, Floor, Room number...">
                                        </div>

                                        <!-- Capacity -->
                                        <div class="col-md-6">
                                            <label class="form-label">
                                                Capacity (Max People) / 容量
                                            </label>
                                            <input type="number" class="form-control" id="capacity" name="capacity" min="0" placeholder="e.g., 100">
                                        </div>

                                        <!-- Area -->
                                        <div class="col-md-6">
                                            <label class="form-label">
                                                Area (Square Feet) / 面积
                                            </label>
                                            <input type="number" step="0.01" class="form-control" id="areaSqft" name="area_sqft" min="0" placeholder="e.g., 1500.50">
                                        </div>

                                        <!-- Description (English) -->
                                        <div class="col-12">
                                            <label class="form-label">
                                                Description (English)
                                            </label>
                                            <textarea class="form-control" id="description" name="description" rows="3" placeholder="Brief description of the venue..."></textarea>
                                        </div>

                                        <!-- Description (Chinese) -->
                                        <div class="col-12">
                                            <label class="form-label">
                                                Description (Chinese) / 描述
                                            </label>
                                            <textarea class="form-control" id="descriptionChinese" name="description_chinese" rows="3" placeholder="场地描述..."></textarea>
                                        </div>

                                        <!-- Facilities (English) -->
                                        <div class="col-12">
                                            <label class="form-label">
                                                Facilities / Available Amenities
                                            </label>
                                            <textarea class="form-control" id="facilities" name="facilities" rows="2" placeholder="e.g., Projector, Sound System, Air Conditioning..."></textarea>
                                        </div>

                                        <!-- Facilities (Chinese) -->
                                        <div class="col-12">
                                            <label class="form-label">
                                                Facilities (Chinese) / 设施
                                            </label>
                                            <textarea class="form-control" id="facilitiesChinese" name="facilities_chinese" rows="2" placeholder="例如：投影仪、音响系统、空调..."></textarea>
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
                                                                    <br><small class="text-muted">Venue is available for booking</small>
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
                                                                    <br><small class="text-muted">Venue is not available</small>
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
                                <button type="button" class="btn btn-primary" id="btnSaveVenue">
                                    <i class="bi bi-check-circle"></i> <span id="btnSaveText">Save Venue / 保存</span>
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
      // Initialize AOS
      AOS.init({
        duration: 800,
        easing: "ease-out-cubic",
        once: true,
        offset: 100,
      });

      // Animate header background
      gsap.to(".venue-header-bg", {
        backgroundPosition: "100% 50%",
        duration: 20,
        repeat: -1,
        yoyo: true,
        ease: "none",
      });

      // Floating animation for header icon
      gsap.to(".venue-header-icon", {
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

      // Add venue button
      $("#btnAddVenue").on("click", function () {
        self.openModal(false);
      });

      // Save venue button
      $("#btnSaveVenue").on("click", function () {
        self.saveVenue();
      });

      // Search input with debounce
      let searchTimeout;
      $("#searchInput").on("input", function () {
        clearTimeout(searchTimeout);
        searchTimeout = setTimeout(function () {
          self.filters.search = $("#searchInput").val();
          self.currentPage = 1;
          self.loadVenues();
        }, 500);
      });

      // Status filter
      $("#statusFilter").on("change", function () {
        self.filters.status = $(this).val();
        self.currentPage = 1;
        self.loadVenues();
      });

      // Clear filters
      $("#btnClearFilter").on("click", function () {
        self.clearFilters();
      });

      // Radio card selection animation
      $(document).on(
        "change",
        'input[type="radio"][name="status"]',
        function () {
          const $parent = $(this).closest(".form-check-card");
          const $siblings = $parent
            .parent()
            .siblings()
            .find(".form-check-card");

          // Animate selected card
          gsap.to($parent[0], {
            scale: 1.05,
            boxShadow: "0 8px 20px rgba(102, 126, 234, 0.3)",
            borderColor: "#667eea",
            duration: 0.3,
            ease: "back.out(1.7)",
          });

          // Reset siblings
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

      // Input focus animations
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

    // Clear filters
    clearFilters: function () {
      this.filters = {
        search: "",
        status: "",
      };
      $("#searchInput").val("");
      $("#statusFilter").val("");
      this.currentPage = 1;
      this.loadVenues();

      TempleCore.showToast("Filters cleared", "info");
    },

    // Load venues
    loadVenues: function () {
      const self = this;

      const params = {
        page: this.currentPage,
        per_page: this.perPage,
        search: this.filters.search,
        status: this.filters.status,
      };

      TempleAPI.get("/hall-booking/venue-master", params)
        .done(function (response) {
          if (response.success) {
            self.venuesData = response.data;
            self.totalPages = response.pagination.total_pages;
            self.renderVenuesTable(response.data, response.pagination);
            self.renderPagination(response.pagination);
          } else {
            TempleCore.showToast("Failed to load venues", "error");
          }
        })
        .fail(function (error) {
          console.error("Error loading venues:", error);
          TempleCore.showToast("Error loading venues", "error");
          $("#venuesTableBody").html(`
                        <tr>
                            <td colspan="8" class="text-center py-5 text-danger">
                                <i class="bi bi-exclamation-triangle fs-1"></i>
                                <p class="mt-2">Failed to load venues. Please try again.</p>
                            </td>
                        </tr>
                    `);
        });
    },

    // Render venues table
    renderVenuesTable: function (venues, pagination) {
      const tbody = $("#venuesTableBody");
      tbody.empty();

      if (venues.length === 0) {
        tbody.html(`
                    <tr>
                        <td colspan="8" class="text-center py-5">
                            <i class="bi bi-inbox fs-1 text-muted"></i>
                            <p class="mt-2 text-muted">No venues found / 未找到场地</p>
                        </td>
                    </tr>
                `);
        $("#recordCount").html("<small>0 records</small>");
        return;
      }

      venues.forEach((venue, index) => {
        const rowNumber =
          (pagination.current_page - 1) * pagination.per_page + index + 1;
        const statusBadge =
          venue.status === 1
            ? '<span class="badge bg-success">Active / 活跃</span>'
            : '<span class="badge bg-danger">Inactive / 非活跃</span>';

        const facilitiesPreview = venue.facilities
          ? venue.facilities.length > 50
            ? venue.facilities.substring(0, 50) + "..."
            : venue.facilities
          : "-";

        const row = `
                    <tr data-aos="fade-up" data-aos-delay="${index * 50}">
                        <td>${rowNumber}</td>
                        <td>
                            <strong>${venue.venue_name}</strong>
                            ${
                              venue.venue_name_chinese
                                ? `<br><small class="text-muted">${venue.venue_name_chinese}</small>`
                                : ""
                            }
                        </td>
                        <td>${venue.location || "-"}</td>
                        <td>${
                          venue.capacity ? venue.capacity + " people" : "-"
                        }</td>
                        <td>${
                          venue.area_sqft ? venue.area_sqft + " sqft" : "-"
                        }</td>
                        <td><small>${facilitiesPreview}</small></td>
                        <td>${statusBadge}</td>
                        <td class="text-center">
                            <div class="btn-group btn-group-sm">
                                <button class="btn btn-outline-primary" onclick="VenueMasterPage.editVenue(${
                                  venue.id
                                })" title="Edit">
                                    <i class="bi bi-pencil"></i>
                                </button>
                                <button class="btn btn-outline-danger" onclick="VenueMasterPage.deleteVenue(${
                                  venue.id
                                }, '${venue.venue_name}')" title="Delete">
                                    <i class="bi bi-trash"></i>
                                </button>
                            </div>
                        </td>
                    </tr>
                `;
        tbody.append(row);
      });

      // Update record count
      $("#recordCount").html(`
                <small>Showing ${pagination.from} to ${pagination.to} of ${pagination.total} records</small>
            `);

      // Re-initialize AOS for new elements
      AOS.refresh();
    },

    // Render pagination
    renderPagination: function (pagination) {
      const container = $("#paginationContainer");
      container.empty();

      if (pagination.total_pages <= 1) {
        return;
      }

      // Previous button
      const prevDisabled = pagination.current_page === 1 ? "disabled" : "";
      container.append(`
                <li class="page-item ${prevDisabled}">
                    <a class="page-link" href="#" onclick="VenueMasterPage.goToPage(${
                      pagination.current_page - 1
                    }); return false;">
                        <i class="bi bi-chevron-left"></i>
                    </a>
                </li>
            `);

      // Page numbers
      for (let i = 1; i <= pagination.total_pages; i++) {
        if (
          i === 1 ||
          i === pagination.total_pages ||
          (i >= pagination.current_page - 1 && i <= pagination.current_page + 1)
        ) {
          const active = i === pagination.current_page ? "active" : "";
          container.append(`
                        <li class="page-item ${active}">
                            <a class="page-link" href="#" onclick="VenueMasterPage.goToPage(${i}); return false;">${i}</a>
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

      // Next button
      const nextDisabled =
        pagination.current_page === pagination.total_pages ? "disabled" : "";
      container.append(`
                <li class="page-item ${nextDisabled}">
                    <a class="page-link" href="#" onclick="VenueMasterPage.goToPage(${
                      pagination.current_page + 1
                    }); return false;">
                        <i class="bi bi-chevron-right"></i>
                    </a>
                </li>
            `);

      // Update pagination info
      $("#paginationInfo").html(`
                <small>Page ${pagination.current_page} of ${pagination.total_pages} (${pagination.total} total records)</small>
            `);
    },

    // Go to page
    goToPage: function (page) {
      if (page < 1 || page > this.totalPages) return;
      this.currentPage = page;
      this.loadVenues();

      // Smooth scroll to top
      $("html, body").animate({ scrollTop: 0 }, 400);
    },

    // Open modal
    openModal: function (isEdit, venueId = null) {
      this.editMode = isEdit;
      this.editId = venueId;

      if (isEdit) {
        $("#modalTitleText").text("Edit Venue / 编辑场地");
        $("#btnSaveText").text("Update Venue / 更新");
        this.loadVenueData(venueId);
      } else {
        $("#modalTitleText").text("Add New Venue / 添加新场地");
        $("#btnSaveText").text("Save Venue / 保存");
        $("#venueForm")[0].reset();
        $("#venueForm").removeClass("was-validated");
      }

      const modal = new bootstrap.Modal(document.getElementById("venueModal"));
      modal.show();

      // Animate modal
      $("#venueModal").on("shown.bs.modal", function () {
        gsap.from("#venueForm .row > div", {
          opacity: 0,
          y: 20,
          stagger: 0.05,
          duration: 0.4,
          ease: "power2.out",
        });
      });
    },

    // Load venue data for editing
    loadVenueData: function (id) {
      const self = this;

      TempleAPI.get("/hall-booking/venue-master/" + id)
        .done(function (response) {
          if (response.success) {
            const venue = response.data;
            $("#venueName").val(venue.venue_name);
            $("#venueNameChinese").val(venue.venue_name_chinese);
            $("#location").val(venue.location);
            $("#capacity").val(venue.capacity);
            $("#areaSqft").val(venue.area_sqft);
            $("#description").val(venue.description);
            $("#descriptionChinese").val(venue.description_chinese);
            $("#facilities").val(venue.facilities);
            $("#facilitiesChinese").val(venue.facilities_chinese);
            $(`input[name="status"][value="${venue.status}"]`)
              .prop("checked", true)
              .trigger("change");
          } else {
            TempleCore.showToast("Failed to load venue data", "error");
          }
        })
        .fail(function (error) {
          console.error("Error loading venue:", error);
          TempleCore.showToast("Error loading venue data", "error");
        });
    },

    // Save venue
    saveVenue: function () {
      const self = this;
      const form = document.getElementById("venueForm");

      if (!form.checkValidity()) {
        form.classList.add("was-validated");
        TempleCore.showToast("Please fill in all required fields", "warning");
        return;
      }

      const formData = {
        venue_name: $("#venueName").val(),
        venue_name_chinese: $("#venueNameChinese").val(),
        description: $("#description").val(),
        description_chinese: $("#descriptionChinese").val(),
        location: $("#location").val(),
        capacity: $("#capacity").val() || null,
        area_sqft: $("#areaSqft").val() || null,
        facilities: $("#facilities").val(),
        facilities_chinese: $("#facilitiesChinese").val(),
        status: parseInt($('input[name="status"]:checked').val()),
      };

      // Disable save button
      $("#btnSaveVenue")
        .prop("disabled", true)
        .html(
          '<span class="spinner-border spinner-border-sm me-2"></span>Saving...'
        );

      const apiCall = this.editMode
        ? TempleAPI.put("/hall-booking/venue-master/" + this.editId, formData)
        : TempleAPI.post("/hall-booking/venue-master", formData);

      apiCall
        .done(function (response) {
          if (response.success) {
            TempleCore.showToast(
              self.editMode
                ? "Venue updated successfully"
                : "Venue created successfully",
              "success"
            );
            bootstrap.Modal.getInstance(
              document.getElementById("venueModal")
            ).hide();
            self.loadVenues();
          } else {
            TempleCore.showToast(
              response.message || "Failed to save venue",
              "error"
            );
          }
        })
        .fail(function (error) {
          console.error("Error saving venue:", error);
          TempleCore.showToast("Error saving venue", "error");
        })
        .always(function () {
          // Re-enable save button
          $("#btnSaveVenue")
            .prop("disabled", false)
            .html(
              '<i class="bi bi-check-circle"></i> ' + $("#btnSaveText").text()
            );
        });
    },

    // Edit venue
    editVenue: function (id) {
      this.openModal(true, id);
    },

    // Delete venue
    deleteVenue: function (id, venueName) {
      const self = this;

      Swal.fire({
        title: "Delete Venue?",
        html: `Are you sure you want to delete <strong>${venueName}</strong>?<br><small class="text-muted">确定要删除此场地吗？</small>`,
        icon: "warning",
        showCancelButton: true,
        confirmButtonColor: "#dc3545",
        cancelButtonColor: "#6c757d",
        confirmButtonText: "Yes, delete it! / 是的，删除",
        cancelButtonText: "Cancel / 取消",
      }).then((result) => {
        if (result.isConfirmed) {
          TempleAPI.delete("/hall-booking/venue-master/" + id)
            .done(function (response) {
              if (response.success) {
                TempleCore.showToast("Venue deleted successfully", "success");
                self.loadVenues();
              } else {
                TempleCore.showToast(
                  response.message || "Failed to delete venue",
                  "error"
                );
              }
            })
            .fail(function (error) {
              console.error("Error deleting venue:", error);
              TempleCore.showToast("Error deleting venue", "error");
            });
        }
      });
    },

    // Cleanup
    destroy: function () {
      AOS.refreshHard();
    },
  };
})(jQuery, window);
