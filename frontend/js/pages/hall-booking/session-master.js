// frontend/js/pages/hall-booking/session-master.js

(function ($, window) {
  "use strict";

  window.SessionMasterPage = {
    currentUser: null,
    sessionsData: [],
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
      this.loadSessions();
    },

    // Render page HTML
    render: function () {
      const html = `
                <!-- Page Header with Animation -->
                <div class="session-header-bg" style="background: linear-gradient(135deg, #f093fb 0%, #f5576c 100%); padding: 2rem 0; margin-bottom: 2rem; border-radius: 15px; position: relative; overflow: hidden;">
                    <div class="container">
                        <div class="row align-items-center">
                            <div class="col-md-8" data-aos="fade-right">
                                <div class="d-flex align-items-center">
                                    <div class="session-header-icon" style="background: rgba(255,255,255,0.2); width: 70px; height: 70px; border-radius: 15px; display: flex; align-items: center; justify-content: center; margin-right: 1.5rem;">
                                        <i class="bi bi-clock-history" style="font-size: 2rem; color: white;"></i>
                                    </div>
                                    <div>
                                        <h2 class="mb-0 text-white">Session / Time Slot Master</h2>
                                        <p class="mb-0 text-white-50">时段管理</p>
                                        <small class="text-white-75">Manage booking sessions and time slots</small>
                                    </div>
                                </div>
                            </div>
                            <div class="col-md-4 text-end" data-aos="fade-left">
                                <button class="btn btn-light btn-lg" id="btnAddSession">
                                    <i class="bi bi-plus-circle"></i> Add New Session
                                    <br><small>添加新时段</small>
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
                                        <i class="bi bi-search"></i> Search Session
                                        <span class="text-muted">/ 搜索时段</span>
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

                <!-- Sessions Table -->
                <div class="container">
                    <div class="card border-0 shadow-sm" data-aos="fade-up" data-aos-delay="100">
                        <div class="card-header bg-white border-0 py-3">
                            <div class="d-flex justify-content-between align-items-center">
                                <h5 class="mb-0">
                                    <i class="bi bi-list-ul text-primary"></i> Sessions List / 时段列表
                                </h5>
                                <div class="text-muted" id="recordCount">
                                    <small>Loading...</small>
                                </div>
                            </div>
                        </div>
                        <div class="card-body p-0">
                            <div class="table-responsive">
                                <table class="table table-hover mb-0" id="sessionsTable">
                                    <thead class="table-light">
                                        <tr>
                                            <th width="5%">#</th>
                                            <th width="25%">Session Name / 时段名称</th>
                                            <th width="15%">Time Slot / 时间段</th>
                                            <th width="12%">Duration / 时长</th>
                                            <th width="15%">Amount / 金额</th>
                                            <th width="10%">Status / 状态</th>
                                            <th width="18%" class="text-center">Actions / 操作</th>
                                        </tr>
                                    </thead>
                                    <tbody id="sessionsTableBody">
                                        <tr>
                                            <td colspan="7" class="text-center py-5">
                                                <div class="spinner-border text-primary" role="status">
                                                    <span class="visually-hidden">Loading...</span>
                                                </div>
                                                <p class="mt-2 text-muted">Loading sessions...</p>
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

                <!-- Add/Edit Session Modal -->
                <div class="modal fade" id="sessionModal" tabindex="-1">
                    <div class="modal-dialog modal-lg modal-dialog-centered modal-dialog-scrollable">
                        <div class="modal-content">
                            <div class="modal-header bg-gradient-primary text-white">
                                <h5 class="modal-title" id="modalTitle">
                                    <i class="bi bi-clock-history"></i> <span id="modalTitleText">Add New Session</span>
                                </h5>
                                <button type="button" class="btn-close btn-close-white" data-bs-dismiss="modal"></button>
                            </div>
                            <div class="modal-body">
                                <form id="sessionForm">
                                    <div class="row g-3">
                                        <!-- Session Name (English) -->
                                        <div class="col-md-6">
                                            <label class="form-label required">
                                                Session Name (English) <span class="text-danger">*</span>
                                            </label>
                                            <input type="text" class="form-control" id="sessionName" name="session_name" required placeholder="e.g., Morning Session">
                                            <div class="invalid-feedback">Please enter session name</div>
                                        </div>

                                        <!-- Session Name (Chinese) -->
                                        <div class="col-md-6">
                                            <label class="form-label">
                                                Session Name (Chinese) / 时段名称
                                            </label>
                                            <input type="text" class="form-control" id="sessionNameChinese" name="session_name_chinese" placeholder="例如：上午时段">
                                        </div>

                                        <!-- Start Time -->
                                        <div class="col-md-6">
                                            <label class="form-label">
                                                <i class="bi bi-clock"></i> Start Time / 开始时间
                                            </label>
                                            <input type="time" class="form-control" id="startTime" name="start_time">
                                            <small class="text-muted">Optional - defines time slot range</small>
                                        </div>

                                        <!-- End Time -->
                                        <div class="col-md-6">
                                            <label class="form-label">
                                                <i class="bi bi-clock-fill"></i> End Time / 结束时间
                                            </label>
                                            <input type="time" class="form-control" id="endTime" name="end_time">
                                            <small class="text-muted">Must be after start time</small>
                                        </div>

                                        <!-- Duration (Hours) -->
                                        <div class="col-md-6">
                                            <label class="form-label required">
                                                <i class="bi bi-hourglass-split"></i> Duration (Hours) / 时长(小时)<span class="text-danger">*</span>
                                            </label>
                                            <select class="form-select" id="durationHours" name="duration_hours" required>
                                                <option value="">Select Duration / 选择时长</option>
                                                <option value="0.5">0.5 Hour (30 mins)</option>
                                                <option value="1">1 Hour</option>
                                                <option value="1.5">1.5 Hours</option>
                                                <option value="2">2 Hours</option>
                                                <option value="2.5">2.5 Hours</option>
                                                <option value="3">3 Hours</option>
                                                <option value="4">4 Hours (Half Day)</option>
                                                <option value="6">6 Hours</option>
                                                <option value="8">8 Hours (Full Day)</option>
                                                <option value="12">12 Hours</option>
                                            </select>
                                            <div class="invalid-feedback">Please select duration</div>
                                        </div>

                                        <!-- Amount -->
                                        <div class="col-md-6">
                                            <label class="form-label required">
                                                <i class="bi bi-currency-dollar"></i> Amount (RM) / 金额 <span class="text-danger">*</span>
                                            </label>
                                            <div class="input-group">
                                                <span class="input-group-text">RM</span>
                                                <input type="number" step="0.01" class="form-control" id="amount" name="amount" required min="0" placeholder="0.00">
                                            </div>
                                            <div class="invalid-feedback">Please enter amount</div>
                                        </div>

                                        <!-- Description (English) -->
                                        <div class="col-12">
                                            <label class="form-label">
                                                Description (English)
                                            </label>
                                            <textarea class="form-control" id="description" name="description" rows="2" placeholder="Brief description of the session..."></textarea>
                                        </div>

                                        <!-- Description (Chinese) -->
                                        <div class="col-12">
                                            <label class="form-label">
                                                Description (Chinese) / 描述
                                            </label>
                                            <textarea class="form-control" id="descriptionChinese" name="description_chinese" rows="2" placeholder="时段描述..."></textarea>
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
                                <button type="button" class="btn btn-primary" id="btnSaveSession">
                                    <i class="bi bi-check-circle"></i> <span id="btnSaveText">Save Session / 保存</span>
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
      gsap.to(".session-header-bg", {
        backgroundPosition: "100% 50%",
        duration: 20,
        repeat: -1,
        yoyo: true,
        ease: "none",
      });

      // Floating animation for header icon
      gsap.to(".session-header-icon", {
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

      // Add session button
      $("#btnAddSession").on("click", function () {
        self.openModal(false);
      });

      // Save session button
      $("#btnSaveSession").on("click", function () {
        self.saveSession();
      });

      // Search input with debounce
      let searchTimeout;
      $("#searchInput").on("input", function () {
        clearTimeout(searchTimeout);
        searchTimeout = setTimeout(function () {
          self.filters.search = $("#searchInput").val();
          self.currentPage = 1;
          self.loadSessions();
        }, 500);
      });

      // Status filter
      $("#statusFilter").on("change", function () {
        self.filters.status = $(this).val();
        self.currentPage = 1;
        self.loadSessions();
      });

      // Clear filters
      $("#btnClearFilter").on("click", function () {
        self.clearFilters();
      });

      // Auto-calculate end time based on start time and duration
      $("#startTime, #durationHours").on("change", function () {
        self.calculateEndTime();
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
            boxShadow: "0 8px 20px rgba(245, 87, 108, 0.3)",
            borderColor: "#f5576c",
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

    // Calculate end time automatically
    calculateEndTime: function () {
      const startTime = $("#startTime").val();
      const duration = parseFloat($("#durationHours").val());

      if (startTime && duration) {
        const [hours, minutes] = startTime.split(":").map(Number);
        const startDate = new Date();
        startDate.setHours(hours, minutes, 0);

        // Add duration in hours
        startDate.setHours(startDate.getHours() + Math.floor(duration));
        startDate.setMinutes(startDate.getMinutes() + (duration % 1) * 60);

        // Format end time
        const endHours = String(startDate.getHours()).padStart(2, "0");
        const endMinutes = String(startDate.getMinutes()).padStart(2, "0");
        $("#endTime").val(`${endHours}:${endMinutes}`);
      }
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
      this.loadSessions();

      TempleCore.showToast("Filters cleared", "info");
    },

    // Load sessions
    loadSessions: function () {
      const self = this;

      const params = {
        page: this.currentPage,
        per_page: this.perPage,
        search: this.filters.search,
        status: this.filters.status,
      };

      TempleAPI.get("/hall-booking/session-master", params)
        .done(function (response) {
          if (response.success) {
            self.sessionsData = response.data;
            self.totalPages = response.pagination.total_pages;
            self.renderSessionsTable(response.data, response.pagination);
            self.renderPagination(response.pagination);
          } else {
            TempleCore.showToast("Failed to load sessions", "error");
          }
        })
        .fail(function (error) {
          console.error("Error loading sessions:", error);
          TempleCore.showToast("Error loading sessions", "error");
          $("#sessionsTableBody").html(`
                        <tr>
                            <td colspan="7" class="text-center py-5 text-danger">
                                <i class="bi bi-exclamation-triangle fs-1"></i>
                                <p class="mt-2">Failed to load sessions. Please try again.</p>
                            </td>
                        </tr>
                    `);
        });
    },

    // Render sessions table
    renderSessionsTable: function (sessions, pagination) {
      const tbody = $("#sessionsTableBody");
      tbody.empty();

      if (sessions.length === 0) {
        tbody.html(`
                    <tr>
                        <td colspan="7" class="text-center py-5">
                            <i class="bi bi-inbox fs-1 text-muted"></i>
                            <p class="mt-2 text-muted">No sessions found / 未找到时段</p>
                        </td>
                    </tr>
                `);
        $("#recordCount").html("<small>0 records</small>");
        return;
      }

      sessions.forEach((session, index) => {
        const rowNumber =
          (pagination.current_page - 1) * pagination.per_page + index + 1;
        const statusBadge =
          session.status === 1
            ? '<span class="badge bg-success">Active / 活跃</span>'
            : '<span class="badge bg-danger">Inactive / 非活跃</span>';

        const timeSlot =
          session.start_time && session.end_time
            ? `${session.start_time} - ${session.end_time}`
            : "-";

        const row = `
                    <tr data-aos="fade-up" data-aos-delay="${index * 50}">
                        <td>${rowNumber}</td>
                        <td>
                            <strong>${session.session_name}</strong>
                            ${
                              session.session_name_chinese
                                ? `<br><small class="text-muted">${session.session_name_chinese}</small>`
                                : ""
                            }
                        </td>
                        <td><i class="bi bi-clock text-primary"></i> ${timeSlot}</td>
                        <td>
                            <span class="badge bg-info">${
                              session.duration_formatted
                            }</span>
                        </td>
                        <td>
                            <strong class="text-success">${
                              session.amount_formatted
                            }</strong>
                        </td>
                        <td>${statusBadge}</td>
                        <td class="text-center">
                            <div class="btn-group btn-group-sm">
                                <button class="btn btn-outline-primary" onclick="SessionMasterPage.editSession(${
                                  session.id
                                })" title="Edit">
                                    <i class="bi bi-pencil"></i>
                                </button>
                                <button class="btn btn-outline-danger" onclick="SessionMasterPage.deleteSession(${
                                  session.id
                                }, '${session.session_name}')" title="Delete">
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
                    <a class="page-link" href="#" onclick="SessionMasterPage.goToPage(${
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
                            <a class="page-link" href="#" onclick="SessionMasterPage.goToPage(${i}); return false;">${i}</a>
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
                    <a class="page-link" href="#" onclick="SessionMasterPage.goToPage(${
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
      this.loadSessions();

      // Smooth scroll to top
      $("html, body").animate({ scrollTop: 0 }, 400);
    },

    // Open modal
    openModal: function (isEdit, sessionId = null) {
      this.editMode = isEdit;
      this.editId = sessionId;

      if (isEdit) {
        $("#modalTitleText").text("Edit Session / 编辑时段");
        $("#btnSaveText").text("Update Session / 更新");
        this.loadSessionData(sessionId);
      } else {
        $("#modalTitleText").text("Add New Session / 添加新时段");
        $("#btnSaveText").text("Save Session / 保存");
        $("#sessionForm")[0].reset();
        $("#sessionForm").removeClass("was-validated");
      }

      const modal = new bootstrap.Modal(
        document.getElementById("sessionModal")
      );
      modal.show();

      // Animate modal
      $("#sessionModal").on("shown.bs.modal", function () {
        gsap.from("#sessionForm .row > div", {
          opacity: 0,
          y: 20,
          stagger: 0.05,
          duration: 0.4,
          ease: "power2.out",
        });
      });
    },

    // Load session data for editing
    loadSessionData: function (id) {
      const self = this;

      TempleAPI.get("/hall-booking/session-master/" + id)
        .done(function (response) {
          if (response.success) {
            const session = response.data;
            $("#sessionName").val(session.session_name);
            $("#sessionNameChinese").val(session.session_name_chinese);
            $("#startTime").val(session.start_time);
            $("#endTime").val(session.end_time);
            $("#durationHours").val(session.duration_hours);
            $("#amount").val(session.amount);
            $("#description").val(session.description);
            $("#descriptionChinese").val(session.description_chinese);
            $(`input[name="status"][value="${session.status}"]`)
              .prop("checked", true)
              .trigger("change");
          } else {
            TempleCore.showToast("Failed to load session data", "error");
          }
        })
        .fail(function (error) {
          console.error("Error loading session:", error);
          TempleCore.showToast("Error loading session data", "error");
        });
    },

    // Save session
    saveSession: function () {
      const self = this;
      const form = document.getElementById("sessionForm");

      if (!form.checkValidity()) {
        form.classList.add("was-validated");
        TempleCore.showToast("Please fill in all required fields", "warning");
        return;
      }

      const formData = {
        session_name: $("#sessionName").val(),
        session_name_chinese: $("#sessionNameChinese").val(),
        duration_hours: parseFloat($("#durationHours").val()),
        amount: parseFloat($("#amount").val()),
        description: $("#description").val(),
        description_chinese: $("#descriptionChinese").val(),
        start_time: $("#startTime").val() || null,
        end_time: $("#endTime").val() || null,
        status: parseInt($('input[name="status"]:checked').val()),
      };

      // Disable save button
      $("#btnSaveSession")
        .prop("disabled", true)
        .html(
          '<span class="spinner-border spinner-border-sm me-2"></span>Saving...'
        );

      const apiCall = this.editMode
        ? TempleAPI.put("/hall-booking/session-master/" + this.editId, formData)
        : TempleAPI.post("/hall-booking/session-master", formData);

      apiCall
        .done(function (response) {
          if (response.success) {
            TempleCore.showToast(
              self.editMode
                ? "Session updated successfully"
                : "Session created successfully",
              "success"
            );
            bootstrap.Modal.getInstance(
              document.getElementById("sessionModal")
            ).hide();
            self.loadSessions();
          } else {
            TempleCore.showToast(
              response.message || "Failed to save session",
              "error"
            );
          }
        })
        .fail(function (error) {
          console.error("Error saving session:", error);
          TempleCore.showToast("Error saving session", "error");
        })
        .always(function () {
          // Re-enable save button
          $("#btnSaveSession")
            .prop("disabled", false)
            .html(
              '<i class="bi bi-check-circle"></i> ' + $("#btnSaveText").text()
            );
        });
    },

    // Edit session
    editSession: function (id) {
      this.openModal(true, id);
    },

    // Delete session
    deleteSession: function (id, sessionName) {
      const self = this;

      Swal.fire({
        title: "Delete Session?",
        html: `Are you sure you want to delete <strong>${sessionName}</strong>?<br><small class="text-muted">确定要删除此时段吗？</small>`,
        icon: "warning",
        showCancelButton: true,
        confirmButtonColor: "#dc3545",
        cancelButtonColor: "#6c757d",
        confirmButtonText: "Yes, delete it! / 是的，删除",
        cancelButtonText: "Cancel / 取消",
      }).then((result) => {
        if (result.isConfirmed) {
          TempleAPI.delete("/hall-booking/session-master/" + id)
            .done(function (response) {
              if (response.success) {
                TempleCore.showToast("Session deleted successfully", "success");
                self.loadSessions();
              } else {
                TempleCore.showToast(
                  response.message || "Failed to delete session",
                  "error"
                );
              }
            })
            .fail(function (error) {
              console.error("Error deleting session:", error);
              TempleCore.showToast("Error deleting session", "error");
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
