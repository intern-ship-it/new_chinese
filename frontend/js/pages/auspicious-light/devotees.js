// js/pages/auspicious-light/devotees.js
// Pagoda Devotees Management - View and manage devotees
// Updated with Family Member Support - FULL VERSION

(function ($, window) {
  "use strict";

  window.PagodaDevoteesPage = {
    currentFilters: {},
    currentPage: 1,
    perPage: 25,
    familyMembers: [],
    familyMemberIndex: 0,

    // Initialize page
    init: function (params) {
      console.log("Initializing Pagoda Devotees Management");
      this.params = params || {};
      this.familyMembers = [];
      this.familyMemberIndex = 0;
      this.render();
      this.loadDevotees();
      this.attachEvents();
      this.loadStatistics();
    },

    // Load statistics
    loadStatistics: function () {
      const self = this;

      console.log("Loading devotee statistics...");

      PagodaAPI.reports
        .getDevoteeAnalytics()
        .done(function (response) {
          console.log("Statistics response:", response);

          if (response.success && response.data) {
            self.updateStatistics(response.data);
          } else {
            console.warn("No statistics data returned");
            self.setDefaultStatistics();
          }
        })
        .fail(function (xhr) {
          console.error("Failed to load devotee statistics:", xhr);
          self.setDefaultStatistics();
        });
    },

    // Update statistics
    updateStatistics: function (data) {
      console.log("Updating statistics with data:", data);

      const stats = data.statistics || data;

      const totalDevotees = stats.total_devotees || stats.total || 0;
      $("#statTotal").text(this.formatNumber(totalDevotees));

      const activeDevotees =
        stats.active_devotees ||
        stats.with_active_registrations ||
        stats.with_active_lights ||
        stats.active ||
        0;
      $("#statActive").text(this.formatNumber(activeDevotees));

      const newThisMonth = stats.new_devotees || stats.new_this_month || 0;
      $("#statNewThisMonth").text(this.formatNumber(newThisMonth));

      const withLights =
        stats.active_devotees ||
        stats.with_active_lights ||
        stats.with_active_registrations ||
        activeDevotees;
      $("#statWithLights").text(this.formatNumber(withLights));

      console.log("Statistics updated successfully:", {
        total: totalDevotees,
        active: activeDevotees,
        newMonth: newThisMonth,
        withLights: withLights,
      });
    },

    // Set default statistics on error
    setDefaultStatistics: function () {
      $("#statTotal").text("0");
      $("#statActive").text("0");
      $("#statNewThisMonth").text("0");
      $("#statWithLights").text("0");
    },

    // Number formatting helper
    formatNumber: function (num) {
      if (num === null || num === undefined) return "0";
      return num.toString().replace(/\B(?=(\d{3})+(?!\d))/g, ",");
    },

    // Render page structure
    render: function () {
      // Inject modal scroll fix CSS
      if (!$("#devoteeModalScrollFix").length) {
        $("head").append(`
      <style id="devoteeModalScrollFix">
        #addDevoteeModal .modal-content,
        #editDevoteeModal .modal-content,
        #devoteeModal .modal-content {
          max-height: 90vh;
          display: flex;
          flex-direction: column;
        }
        #addDevoteeModal .modal-body,
        #editDevoteeModal .modal-body,
        #devoteeModal .modal-body {
          max-height: calc(90vh - 140px);
          overflow-y: auto !important;
          overflow-x: hidden;
          padding: 1.5rem;
        }
        #addDevoteeModal .modal-header,
        #editDevoteeModal .modal-header,
        #devoteeModal .modal-header,
        #addDevoteeModal .modal-footer,
        #editDevoteeModal .modal-footer,
        #devoteeModal .modal-footer {
          flex-shrink: 0;
        }
        #addDevoteeModal .modal-body::-webkit-scrollbar,
        #editDevoteeModal .modal-body::-webkit-scrollbar,
        #devoteeModal .modal-body::-webkit-scrollbar {
          width: 8px;
        }
        #addDevoteeModal .modal-body::-webkit-scrollbar-track,
        #editDevoteeModal .modal-body::-webkit-scrollbar-track,
        #devoteeModal .modal-body::-webkit-scrollbar-track {
          background: #f1f1f1;
          border-radius: 10px;
        }
        #addDevoteeModal .modal-body::-webkit-scrollbar-thumb,
        #editDevoteeModal .modal-body::-webkit-scrollbar-thumb,
        #devoteeModal .modal-body::-webkit-scrollbar-thumb {
          background: #888;
          border-radius: 10px;
        }
        #addDevoteeModal .modal-body::-webkit-scrollbar-thumb:hover,
        #editDevoteeModal .modal-body::-webkit-scrollbar-thumb:hover,
        #devoteeModal .modal-body::-webkit-scrollbar-thumb:hover {
          background: #555;
        }
        #addFamilyMembersSection .card-body,
        #editFamilyMembersSection .card-body {
          max-height: 400px;
          overflow-y: auto;
        }
        #addFamilyMembersSection .card-body::-webkit-scrollbar,
        #editFamilyMembersSection .card-body::-webkit-scrollbar {
          width: 6px;
        }
        #addFamilyMembersSection .card-body::-webkit-scrollbar-thumb,
        #editFamilyMembersSection .card-body::-webkit-scrollbar-thumb {
          background: #ffc107;
          border-radius: 10px;
        }
        @media (max-width: 768px) {
          #addDevoteeModal .modal-content,
          #editDevoteeModal .modal-content,
          #devoteeModal .modal-content {
            max-height: 95vh;
          }
          #addDevoteeModal .modal-body,
          #editDevoteeModal .modal-body,
          #devoteeModal .modal-body {
            max-height: calc(95vh - 120px);
            padding: 1rem;
          }
        }
      </style>
    `);
      }

      const html = `
    <div class="devotees-container">
                    
                    <!-- Page Header -->
                    <div class="page-header mb-4">
                        <div class="d-flex justify-content-between align-items-center flex-wrap">
                            <div>
                                <h1 class="page-title mb-2">
                                    <i class="bi bi-people me-2"></i>
                                    Devotees Management
                                </h1>
                                <p class="text-muted mb-0">信徒管理 - Manage devotee information and history</p>
                            </div>
                            <div class="d-flex gap-2 mt-3 mt-md-0">
                                <button class="btn btn-outline-secondary" id="btnResetFilters">
                                    <i class="bi bi-arrow-counterclockwise"></i> Reset
                                </button>
                                <button class="btn btn-outline-primary" id="btnExportDevotees">
                                    <i class="bi bi-download"></i> Export
                                </button>
                                <button class="btn btn-success" id="btnAddDevotee">
                                    <i class="bi bi-person-plus"></i> Add Devotee
                                </button>
                            </div>
                        </div>
                    </div>

                    <!-- Statistics Cards -->
                    <div class="row g-3 mb-4">
                        <div class="col-6 col-md-3">
                            <div class="card stat-card border-start border-primary border-4">
                                <div class="card-body">
                                    <div class="d-flex justify-content-between align-items-center">
                                        <div>
                                            <p class="text-muted mb-1 small">Total Devotees</p>
                                            <h3 class="mb-0" id="statTotal">-</h3>
                                        </div>
                                        <i class="bi bi-people text-primary fs-2"></i>
                                    </div>
                                </div>
                            </div>
                        </div>
                        <div class="col-6 col-md-3">
                            <div class="card stat-card border-start border-success border-4">
                                <div class="card-body">
                                    <div class="d-flex justify-content-between align-items-center">
                                        <div>
                                            <p class="text-muted mb-1 small">Active</p>
                                            <h3 class="mb-0" id="statActive">-</h3>
                                        </div>
                                        <i class="bi bi-check-circle text-success fs-2"></i>
                                    </div>
                                </div>
                            </div>
                        </div>
                        <div class="col-6 col-md-3">
                            <div class="card stat-card border-start border-info border-4">
                                <div class="card-body">
                                    <div class="d-flex justify-content-between align-items-center">
                                        <div>
                                            <p class="text-muted mb-1 small">New (This Month)</p>
                                            <h3 class="mb-0" id="statNewThisMonth">-</h3>
                                        </div>
                                        <i class="bi bi-person-plus text-info fs-2"></i>
                                    </div>
                                </div>
                            </div>
                        </div>
                        <div class="col-6 col-md-3">
                            <div class="card stat-card border-start border-warning border-4">
                                <div class="card-body">
                                    <div class="d-flex justify-content-between align-items-center">
                                        <div>
                                            <p class="text-muted mb-1 small">With Active Lights</p>
                                            <h3 class="mb-0" id="statWithLights">-</h3>
                                        </div>
                                        <i class="bi bi-lightbulb text-warning fs-2"></i>
                                    </div>
                                </div>
                            </div>
                        </div>
                    </div>

                    <!-- Search & Filter -->
                    <div class="card mb-4">
                        <div class="card-header">
                            <h5 class="mb-0">
                                <i class="bi bi-funnel me-2"></i>
                                Search & Filter
                            </h5>
                        </div>
                        <div class="card-body">
                            <div class="row g-3">
                                <!-- Quick Search -->
                                <div class="col-md-6">
                                    <label class="form-label">Quick Search</label>
                                    <div class="input-group">
                                        <span class="input-group-text">
                                            <i class="bi bi-search"></i>
                                        </span>
                                        <input type="text" class="form-control" id="searchInput" 
                                               placeholder="Name, NRIC, Contact Number...">
                                    </div>
                                </div>

                                <!-- Sort By -->
                                <div class="col-md-3">
                                    <label class="form-label">Sort By</label>
                                    <select class="form-select" id="sortBy">
                                        <option value="created_at">Recent First</option>
                                        <option value="name_english">Name (A-Z)</option>
                                        <option value="registrations_count">Most Registrations</option>
                                    </select>
                                </div>

                                <!-- Filter -->
                                <div class="col-md-3">
                                    <label class="form-label">Filter</label>
                                    <select class="form-select" id="filterType">
                                        <option value="">All Devotees</option>
                                        <option value="with_active">With Active Lights</option>
                                        <option value="new_this_month">New This Month</option>
                                        <option value="no_registrations">No Registrations</option>
                                        <option value="head_of_family">Head of Family</option>
                                    </select>
                                </div>
                            </div>

                            <div class="row mt-3">
                                <div class="col-12">
                                    <button class="btn btn-primary" id="btnApplyFilters">
                                        <i class="bi bi-search"></i> Search
                                    </button>
                                    <button class="btn btn-outline-secondary ms-2" id="btnClearFilters">
                                        <i class="bi bi-x-circle"></i> Clear
                                    </button>
                                </div>
                            </div>
                        </div>
                    </div>

                    <!-- Devotees List -->
                    <div class="card">
                        <div class="card-header d-flex justify-content-between align-items-center">
                            <h5 class="mb-0">
                                <i class="bi bi-list-ul me-2"></i>
                                Devotees List
                            </h5>
                            <div class="d-flex align-items-center gap-3">
                                <span class="text-muted" id="resultsCount">Loading...</span>
                                <select class="form-select form-select-sm" id="perPageSelect" style="width: auto;">
                                    <option value="10">10 per page</option>
                                    <option value="25" selected>25 per page</option>
                                    <option value="50">50 per page</option>
                                    <option value="100">100 per page</option>
                                </select>
                            </div>
                        </div>
                        <div class="card-body p-0">
                            <div class="table-responsive">
                                <table class="table table-hover mb-0" id="devoteesTable">
                                    <thead class="table-light">
                                        <tr>
                                            <th>Name</th>
                                            <th>NRIC</th>
                                            <th>Contact</th>
                                            <th>Email</th>
                                            <th>Family</th>
                                            <th>Registrations</th>
                                            <th>Active Lights</th>
                                            <th>Actions</th>
                                        </tr>
                                    </thead>
                                    <tbody id="devoteesTableBody">
                                        <tr>
                                            <td colspan="8" class="text-center py-5">
                                                <div class="spinner-border text-primary" role="status">
                                                    <span class="visually-hidden">Loading...</span>
                                                </div>
                                                <p class="mt-3 text-muted">Loading devotees...</p>
                                            </td>
                                        </tr>
                                    </tbody>
                                </table>
                            </div>
                        </div>
                        <div class="card-footer">
                            <div id="paginationContainer"></div>
                        </div>
                    </div>

                </div>
            `;

      $("#page-container").html(html);
    },

    // Load devotees
    loadDevotees: function () {
      const self = this;

      const params = {
        page: this.currentPage,
        per_page: this.perPage,
        ...this.currentFilters,
      };

      TempleUtils.showLoading("Loading devotees...");

      PagodaAPI.devotees
        .getAll(params)
        .done(function (response) {
          if (response.success && response.data) {
            self.renderDevoteesTable(response.data);
            self.renderPagination(response.data);

            if (response.data.statistics) {
              self.updateStatistics(response.data.statistics);
            }
          } else {
            self.showNoResults();
          }
        })
        .fail(function (xhr) {
          TempleUtils.handleAjaxError(xhr, "Failed to load devotees");
          self.showNoResults();
        })
        .always(function () {
          TempleUtils.hideLoading();
        });
    },

    // Render devotees table
    renderDevoteesTable: function (data) {
      const self = this;
      const devotees = data.data || [];
      const total = data.total || 0;

      $("#resultsCount").text(
        `Showing ${devotees.length} of ${total} devotees`
      );

      if (devotees.length === 0) {
        this.showNoResults();
        return;
      }

      const rows = devotees
        .map((devotee) => {
          const totalRegs = devotee.total_registrations || 0;
          const activeRegs = devotee.active_registrations || 0;

          const activeLightsBadge =
            activeRegs > 0
              ? `<span class="badge bg-success">${activeRegs}</span>`
              : '<span class="text-muted">-</span>';

          // Family badge
          let familyBadge = '<span class="text-muted">-</span>';
          if (devotee.is_head_of_family) {
            const memberCount = devotee.family_members_count || 0;
            familyBadge = `<span class="badge bg-primary" title="Head of Family"><i class="bi bi-house-door me-1"></i>${memberCount}</span>`;
          } else if (devotee.head_of_family_id) {
            familyBadge = `<span class="badge bg-secondary" title="Family Member"><i class="bi bi-person"></i></span>`;
          }

          return `
                    <tr data-id="${devotee.id}">
                        <td>
                            <div>
                                <strong>${devotee.name_english}</strong>
                                ${
                                  devotee.name_chinese
                                    ? `<br><small class="text-muted">${devotee.name_chinese}</small>`
                                    : ""
                                }
                            </div>
                        </td>
                        <td>
                            <small>${devotee.nric || "-"}</small>
                        </td>
                        <td>
                            <small>
                                <i class="bi bi-telephone me-1"></i>${
                                  devotee.contact_no
                                }
                            </small>
                        </td>
                        <td>
                            <small>${devotee.email || "-"}</small>
                        </td>
                        <td class="text-center">
                            ${familyBadge}
                        </td>
                        <td class="text-center">
                            <span class="badge bg-primary">${totalRegs}</span>
                        </td>
                        <td class="text-center">
                            ${activeLightsBadge}
                        </td>
                        <td>
                            <div class="btn-group btn-group-sm">
                                <button class="btn btn-outline-primary btn-view-devotee" 
                                        data-id="${
                                          devotee.id
                                        }" title="View Details">
                                    <i class="bi bi-eye"></i>
                                </button>
                                <button class="btn btn-outline-secondary btn-edit-devotee" 
                                        data-id="${devotee.id}" title="Edit">
                                    <i class="bi bi-pencil"></i>
                                </button>
                                <button class="btn btn-outline-success btn-new-registration" 
                                        data-id="${
                                          devotee.id
                                        }" title="New Registration">
                                    <i class="bi bi-plus-circle"></i>
                                </button>
                            </div>
                        </td>
                    </tr>
                `;
        })
        .join("");

      $("#devoteesTableBody").html(rows);
    },

    // Show no results
    showNoResults: function () {
      $("#devoteesTableBody").html(`
                <tr>
                    <td colspan="8" class="text-center py-5">
                        <i class="bi bi-inbox display-4 text-muted d-block mb-3"></i>
                        <p class="text-muted">No devotees found</p>
                        <button class="btn btn-sm btn-outline-primary" id="btnClearFiltersNoResults">
                            <i class="bi bi-arrow-counterclockwise"></i> Clear Filters
                        </button>
                    </td>
                </tr>
            `);

      $("#resultsCount").text("No results");
      $("#paginationContainer").empty();
    },

    // Render pagination
    renderPagination: function (data) {
      const totalPages = data.last_page || 1;
      const currentPage = data.current_page || 1;

      if (totalPages <= 1) {
        $("#paginationContainer").empty();
        return;
      }

      let paginationHtml =
        '<nav><ul class="pagination pagination-sm mb-0 justify-content-center">';

      // Previous
      paginationHtml += `
                <li class="page-item ${currentPage === 1 ? "disabled" : ""}">
                    <a class="page-link" href="#" data-page="${
                      currentPage - 1
                    }">
                        <i class="bi bi-chevron-left"></i>
                    </a>
                </li>
            `;

      // Pages
      let startPage = Math.max(1, currentPage - 2);
      let endPage = Math.min(totalPages, currentPage + 2);

      if (startPage > 1) {
        paginationHtml += `<li class="page-item"><a class="page-link" href="#" data-page="1">1</a></li>`;
        if (startPage > 2) {
          paginationHtml += `<li class="page-item disabled"><span class="page-link">...</span></li>`;
        }
      }

      for (let i = startPage; i <= endPage; i++) {
        paginationHtml += `
                    <li class="page-item ${i === currentPage ? "active" : ""}">
                        <a class="page-link" href="#" data-page="${i}">${i}</a>
                    </li>
                `;
      }

      if (endPage < totalPages) {
        if (endPage < totalPages - 1) {
          paginationHtml += `<li class="page-item disabled"><span class="page-link">...</span></li>`;
        }
        paginationHtml += `<li class="page-item"><a class="page-link" href="#" data-page="${totalPages}">${totalPages}</a></li>`;
      }

      // Next
      paginationHtml += `
                <li class="page-item ${
                  currentPage === totalPages ? "disabled" : ""
                }">
                    <a class="page-link" href="#" data-page="${
                      currentPage + 1
                    }">
                        <i class="bi bi-chevron-right"></i>
                    </a>
                </li>
            `;

      paginationHtml += "</ul></nav>";

      $("#paginationContainer").html(paginationHtml);
    },

    // Attach event handlers
    attachEvents: function () {
      const self = this;

      // Remove old event handlers first
      this.detachEvents();

      // Apply filters
      $(document).on("click.pagodaDevotees", "#btnApplyFilters", function () {
        self.applyFilters();
      });

      // Clear filters
      $(document).on(
        "click.pagodaDevotees",
        "#btnClearFilters, #btnClearFiltersNoResults",
        function () {
          self.clearFilters();
        }
      );

      // Reset filters
      $(document).on("click.pagodaDevotees", "#btnResetFilters", function () {
        self.clearFilters();
      });

      // Search on Enter
      $(document).on("keypress.pagodaDevotees", "#searchInput", function (e) {
        if (e.which === 13) {
          self.applyFilters();
        }
      });

      // Per page change
      $(document).on("change.pagodaDevotees", "#perPageSelect", function () {
        self.perPage = parseInt($(this).val());
        self.currentPage = 1;
        self.loadDevotees();
      });

      // Pagination
      $(document).on(
        "click.pagodaDevotees",
        "#paginationContainer .page-link",
        function (e) {
          e.preventDefault();
          const page = parseInt($(this).data("page"));
          if (page && !$(this).parent().hasClass("disabled")) {
            self.currentPage = page;
            self.loadDevotees();
            $("html, body").animate({ scrollTop: 0 }, 300);
          }
        }
      );

      // View devotee
      $(document).on("click.pagodaDevotees", ".btn-view-devotee", function () {
        const id = $(this).data("id");
        self.viewDevotee(id);
      });

      // Edit devotee
      $(document).on("click.pagodaDevotees", ".btn-edit-devotee", function () {
        const id = $(this).data("id");
        self.editDevotee(id);
      });

      // New registration for devotee
      $(document).on(
        "click.pagodaDevotees",
        ".btn-new-registration",
        function () {
          const id = $(this).data("id");
          self.newRegistrationForDevotee(id);
        }
      );

      // Add devotee
      $(document).on("click.pagodaDevotees", "#btnAddDevotee", function () {
        self.showAddDevoteeModal();
      });

      // Export
      $(document).on("click.pagodaDevotees", "#btnExportDevotees", function () {
        self.exportDevotees();
      });
    },

    // Detach all event handlers
    detachEvents: function () {
      $(document).off(".pagodaDevotees");
      console.log("Pagoda Devotees events detached");
    },

    // Apply filters
    applyFilters: function () {
      this.currentFilters = {
        search: $("#searchInput").val().trim(),
        sort_by: $("#sortBy").val(),
        filter: $("#filterType").val(),
      };

      Object.keys(this.currentFilters).forEach((key) => {
        if (!this.currentFilters[key]) {
          delete this.currentFilters[key];
        }
      });

      this.currentPage = 1;
      this.loadDevotees();
    },

    // Clear filters
    clearFilters: function () {
      $("#searchInput").val("");
      $("#sortBy").val("created_at");
      $("#filterType").val("");

      this.currentFilters = {};
      this.currentPage = 1;
      this.loadDevotees();
    },

    // View devotee details
    viewDevotee: function (id) {
      const self = this;

      TempleUtils.showLoading("Loading devotee details...");

      PagodaAPI.devotees
        .getById(id)
        .done(function (response) {
          if (response.success && response.data) {
            self.showDevoteeModal(response.data);
          }
        })
        .fail(function (xhr) {
          TempleUtils.handleAjaxError(xhr, "Failed to load devotee details");
        })
        .always(function () {
          TempleUtils.hideLoading();
        });
    },

    // Show devotee modal
    showDevoteeModal: function (data) {
      const self = this;
      const devotee = data.devotee;
      const registrations = data.registrations || [];
      const statistics = data.statistics || {};
      const familyMembers = data.family_members || [];

      const regsRows =
        registrations
          .map(
            (reg) => `
                <tr>
                    <td><span class="badge bg-secondary">${
                      reg.receipt_number
                    }</span></td>
                    <td><code class="light-code">${reg.light_code}</code></td>
                    <td class="text-center"><small>${moment(
                      reg.offer_date
                    ).format("DD/MM/YYYY")}</small></td>
                    <td class="text-center"><small>${moment(
                      reg.expiry_date
                    ).format("DD/MM/YYYY")}</small></td>
                    <td class="text-end">${PagodaAPI.utils.formatCurrency(
                      reg.merit_amount
                    )}</td>
                    <td>
                        <span class="badge bg-${
                          reg.status === "active"
                            ? "success"
                            : reg.status === "expired"
                            ? "warning"
                            : "secondary"
                        }">
                            ${reg.status}
                        </span>
                    </td>
                </tr>
            `
          )
          .join("") ||
        '<tr><td colspan="6" class="text-center text-muted py-3">No registrations yet</td></tr>';

      const totalRegistrations = statistics.total_registrations || 0;
      const activeRegistrations = statistics.active_registrations || 0;
      const totalMerit = statistics.total_merit_contributed || 0;

      // Family members section
      let familySection = "";
      if (devotee.is_head_of_family && familyMembers.length > 0) {
        const familyRows = familyMembers
          .map(
            (member) => `
                    <tr>
                        <td>${member.name || member.name_english || "-"}</td>
                        <td><small>${member.nric || "-"}</small></td>
                        <td><span class="badge bg-info">${this.getRelationshipDisplay(
                          member.relationship
                        )}</span></td>
                    </tr>
                `
          )
          .join("");

        familySection = `
                    <div class="col-12">
                        <h6 class="border-bottom pb-2 mb-3">
                            <i class="bi bi-people me-2"></i>Family Members (${familyMembers.length})
                        </h6>
                        <div class="table-responsive">
                            <table class="table table-sm table-hover">
                                <thead class="table-light">
                                    <tr>
                                        <th>Name</th>
                                        <th>NRIC</th>
                                        <th>Relationship</th>
                                    </tr>
                                </thead>
                                <tbody>
                                    ${familyRows}
                                </tbody>
                            </table>
                        </div>
                    </div>
                `;
      }

      // Head of family info (if this is a family member)
      let headOfFamilySection = "";
      if (data.head_of_family) {
        headOfFamilySection = `
                    <div class="col-12">
                        <div class="alert alert-info">
                            <i class="bi bi-diagram-3 me-2"></i>
                            <strong>Family Member of:</strong> ${data.head_of_family.name_english} (${data.head_of_family.nric})
                        </div>
                    </div>
                `;
      }

      const modalHtml = `
                <div class="modal fade" id="devoteeModal" tabindex="-1">
                    <div class="modal-dialog modal-lg modal-dialog-scrollable">
                        <div class="modal-content">
                            <div class="modal-header bg-primary text-white">
                                <h5 class="modal-title">
                                    <i class="bi bi-person me-2"></i>
                                    Devotee Details
                                    ${
                                      devotee.is_head_of_family
                                        ? '<span class="badge bg-warning ms-2">Head of Family</span>'
                                        : ""
                                    }
                                </h5>
                                <button type="button" class="btn-close btn-close-white" data-bs-dismiss="modal"></button>
                            </div>
                            <div class="modal-body">
                                <div class="row g-4">
                                    ${headOfFamilySection}
                                    
                                    <!-- Personal Information -->
                                    <div class="col-md-6">
                                        <h6 class="border-bottom pb-2 mb-3">
                                            <i class="bi bi-person-badge me-2"></i>Personal Information
                                        </h6>
                                        <table class="table table-sm table-borderless">
                                            <tr>
                                                <td class="text-muted" width="40%">Name (English):</td>
                                                <td><strong>${
                                                  devotee.name_english
                                                }</strong></td>
                                            </tr>
                                            ${
                                              devotee.name_chinese
                                                ? `
                                            <tr>
                                                <td class="text-muted">Name (Chinese):</td>
                                                <td><strong>${devotee.name_chinese}</strong></td>
                                            </tr>
                                            `
                                                : ""
                                            }
                                            <tr>
                                                <td class="text-muted">NRIC:</td>
                                                <td>${devotee.nric || "-"}</td>
                                            </tr>
                                            ${
                                              devotee.date_of_birth
                                                ? `
                                            <tr>
                                                <td class="text-muted">Date of Birth:</td>
                                                <td>${moment(
                                                  devotee.date_of_birth
                                                ).format("DD/MM/YYYY")}</td>
                                            </tr>
                                            `
                                                : ""
                                            }
                                            ${
                                              devotee.gender
                                                ? `
                                            <tr>
                                                <td class="text-muted">Gender:</td>
                                                <td>${
                                                  devotee.gender === "male"
                                                    ? "Male / 男"
                                                    : "Female / 女"
                                                }</td>
                                            </tr>
                                            `
                                                : ""
                                            }
                                        </table>
                                    </div>
                                    
                                    <!-- Contact Information -->
                                    <div class="col-md-6">
                                        <h6 class="border-bottom pb-2 mb-3">
                                            <i class="bi bi-telephone me-2"></i>Contact Information
                                        </h6>
                                        <table class="table table-sm table-borderless">
                                            <tr>
                                                <td class="text-muted" width="40%">Contact Number:</td>
                                                <td>${devotee.contact_no}</td>
                                            </tr>
                                            <tr>
                                                <td class="text-muted">Email:</td>
                                                <td>${devotee.email || "-"}</td>
                                            </tr>
                                            ${
                                              devotee.address
                                                ? `
                                            <tr>
                                                <td class="text-muted">Address:</td>
                                                <td>${devotee.address}</td>
                                            </tr>
                                            `
                                                : ""
                                            }
                                            <tr>
                                                <td class="text-muted">Registered On:</td>
                                                <td>${moment(
                                                  devotee.created_at
                                                ).format("DD/MM/YYYY")}</td>
                                            </tr>
                                        </table>
                                    </div>
                                    
                                    ${familySection}
                                    
                                    <!-- Statistics -->
                                    <div class="col-12">
                                        <h6 class="border-bottom pb-2 mb-3">
                                            <i class="bi bi-graph-up me-2"></i>Registration Statistics
                                        </h6>
                                        <div class="row text-center g-3">
                                            <div class="col-4">
                                                <div class="card bg-light">
                                                    <div class="card-body">
                                                        <h4 class="text-primary mb-1">${totalRegistrations}</h4>
                                                        <small class="text-muted">Total Registrations</small>
                                                    </div>
                                                </div>
                                            </div>
                                            <div class="col-4">
                                                <div class="card bg-light">
                                                    <div class="card-body">
                                                        <h4 class="text-success mb-1">${activeRegistrations}</h4>
                                                        <small class="text-muted">Active Lights</small>
                                                    </div>
                                                </div>
                                            </div>
                                            <div class="col-4">
                                                <div class="card bg-light">
                                                    <div class="card-body">
                                                        <h4 class="text-info mb-1">${PagodaAPI.utils.formatCurrency(
                                                          totalMerit
                                                        )}</h4>
                                                        <small class="text-muted">Total Merit</small>
                                                    </div>
                                                </div>
                                            </div>
                                        </div>
                                    </div>
                                    
                                    <!-- Registration History -->
                                    <div class="col-12">
                                        <h6 class="border-bottom pb-2 mb-3">
                                            <i class="bi bi-clock-history me-2"></i>Registration History
                                        </h6>
                                        <div class="table-responsive">
                                            <table class="table table-sm table-hover">
                                                <thead class="table-light">
                                                    <tr>
                                                        <th>Receipt #</th>
                                                        <th>Light Code</th>
                                                        <th>Offer Date</th>
                                                        <th>Expiry Date</th>
                                                        <th>Amount</th>
                                                        <th>Status</th>
                                                    </tr>
                                                </thead>
                                                <tbody>
                                                    ${regsRows}
                                                </tbody>
                                            </table>
                                        </div>
                                    </div>
                                </div>
                            </div>
                            <div class="modal-footer">
                                <button type="button" class="btn btn-secondary" data-bs-dismiss="modal">Close</button>
                                <button type="button" class="btn btn-outline-primary btn-edit-devotee-modal" data-id="${
                                  devotee.id
                                }">
                                    <i class="bi bi-pencil"></i> Edit
                                </button>
                                <button type="button" class="btn btn-success btn-new-registration-modal" data-id="${
                                  devotee.id
                                }">
                                    <i class="bi bi-plus-circle"></i> New Registration
                                </button>
                            </div>
                        </div>
                    </div>
                </div>
            `;

      $("#devoteeModal").remove();
      $("body").append(modalHtml);
      const modal = new bootstrap.Modal(
        document.getElementById("devoteeModal")
      );
      modal.show();

      $("#devoteeModal").on("click", ".btn-edit-devotee-modal", function () {
        const id = $(this).data("id");
        modal.hide();
        setTimeout(() => {
          self.editDevotee(id);
        }, 300);
      });

      $("#devoteeModal").on(
        "click",
        ".btn-new-registration-modal",
        function () {
          const id = $(this).data("id");
          modal.hide();
          setTimeout(() => {
            self.newRegistrationForDevotee(id);
          }, 300);
        }
      );

      $("#devoteeModal").on("hidden.bs.modal", function () {
        $(this).remove();
      });
    },

    // ============================================
    // IMPROVED: Add New Devotee Modal with Family Support
    // ============================================
    showAddDevoteeModal: function () {
      const self = this;

      // Reset family members tracking
      self.familyMembers = [];
      self.familyMemberIndex = 0;

      const modalHtml = `
                <div class="modal fade" id="addDevoteeModal" tabindex="-1">
                    <div class="modal-dialog modal-lg modal-dialog-scrollable">
                        <div class="modal-content">
                            <div class="modal-header bg-success text-white">
                                <h5 class="modal-title">
                                    <i class="bi bi-person-plus me-2"></i>
                                    Add New Devotee / 新增信徒
                                </h5>
                                <button type="button" class="btn-close btn-close-white" data-bs-dismiss="modal"></button>
                            </div>
                            <form id="addDevoteeForm">
                                <div class="modal-body">
                                    
                                    <!-- NRIC Search Tip -->
                                    <div class="alert alert-info mb-4">
                                        <i class="bi bi-info-circle me-2"></i>
                                        <strong>Tip:</strong> Enter NRIC and click search to auto-fill existing devotee or family information
                                    </div>
                                    
                                    <!-- Personal Information Section -->
                                    <div class="card mb-4">
                                        <div class="card-header bg-light">
                                            <h6 class="mb-0">
                                                <i class="bi bi-person-badge me-2 text-primary"></i>
                                                Personal Information / 个人资料
                                            </h6>
                                        </div>
                                        <div class="card-body">
                                            <div class="row g-3">
                                                <!-- Row 1: Names -->
                                                <div class="col-md-6">
                                                    <label class="form-label">Name (English) / 姓名 (英文) <span class="text-danger">*</span></label>
                                                    <input type="text" class="form-control" name="name_english" id="addNameEnglish" required 
                                                           placeholder="e.g., Tan Ah Kow">
                                                </div>
                                                <div class="col-md-6">
                                                    <label class="form-label">Name (Chinese) / 姓名 (中文)</label>
                                                    <input type="text" class="form-control" name="name_chinese" id="addNameChinese"
                                                           placeholder="e.g., 陈亚狗">
                                                </div>
                                                
                                                <!-- Row 2: NRIC & DOB -->
                                                <div class="col-md-6">
                                                    <label class="form-label">NRIC / 身份证号码 <span class="text-danger">*</span></label>
                                                    <div class="input-group">
                                                        <input type="text" class="form-control" name="nric" id="addNricInput" required
                                                               placeholder="e.g., 850615-08-1234">
                                                        <button type="button" class="btn btn-outline-primary" id="btnSearchNricAdd" title="Search NRIC">
                                                            <i class="bi bi-search"></i>
                                                        </button>
                                                    </div>
                                                    <div id="addNricSearchResult" class="mt-1"></div>
                                                </div>
                                                <div class="col-md-6">
                                                    <label class="form-label">Date of Birth / 出生日期</label>
                                                    <input type="date" class="form-control" name="date_of_birth" id="addDateOfBirth">
                                                </div>
                                                
                                                <!-- Row 3: Gender & Contact -->
                                                <div class="col-md-6">
                                                    <label class="form-label">Gender / 性别</label>
                                                    <select class="form-select" name="gender" id="addGender">
                                                        <option value="">-- Select / 选择 --</option>
                                                        <option value="male">Male / 男</option>
                                                        <option value="female">Female / 女</option>
                                                    </select>
                                                </div>
                                                <div class="col-md-6">
                                                    <label class="form-label">Contact Number / 联络电话 <span class="text-danger">*</span></label>
                                                    <input type="tel" class="form-control" name="contact_no" id="addContactNo" required
                                                           placeholder="e.g., +60123456789">
                                                </div>
                                                
                                                <!-- Row 4: Email & Address -->
                                                <div class="col-md-6">
                                                    <label class="form-label">Email / 电邮</label>
                                                    <input type="email" class="form-control" name="email" id="addEmail"
                                                           placeholder="e.g., devotee@email.com">
                                                </div>
                                                <div class="col-md-6">
                                                    <label class="form-label">Address / 地址</label>
                                                    <input type="text" class="form-control" name="address" id="addAddress"
                                                           placeholder="e.g., 123, Jalan ABC">
                                                </div>
                                            </div>
                                        </div>
                                    </div>
                                    
                                    <!-- Head of Family Checkbox -->
                                    <div class="card mb-4">
                                        <div class="card-body">
                                            <div class="form-check form-switch">
                                                <input class="form-check-input" type="checkbox" id="addIsHeadOfFamily" style="transform: scale(1.3);">
                                                <label class="form-check-label ms-2" for="addIsHeadOfFamily">
                                                    <strong>Is this person the Head of Family? / 此人是否为一家之主?</strong>
                                                </label>
                                            </div>
                                            <small class="text-muted d-block mt-1">
                                                <i class="bi bi-info-circle me-1"></i>
                                                Enable this to add family members under this devotee
                                            </small>
                                        </div>
                                    </div>
                                    
                                    <!-- Family Members Section (Hidden by default) -->
                                    <div id="addFamilyMembersSection" class="card mb-3" style="display: none;">
                                        <div class="card-header bg-warning bg-opacity-25 d-flex justify-content-between align-items-center">
                                            <h6 class="mb-0">
                                                <i class="bi bi-people me-2 text-warning"></i>
                                                Family Members / 家庭成员
                                            </h6>
                                            <button type="button" class="btn btn-sm btn-success" id="btnAddFamilyMemberAdd">
                                                <i class="bi bi-plus-circle me-1"></i> Add Member / 添加成员
                                            </button>
                                        </div>
                                        <div class="card-body">
                                            <div id="addFamilyMembersList">
                                                <div class="text-center text-muted py-3" id="addNoFamilyMembersMsg">
                                                    <i class="bi bi-people d-block fs-3 mb-2"></i>
                                                    No family members added yet. Click "Add Member" to add.<br>
                                                    还没有添加家庭成员。点击"添加成员"来添加。
                                                </div>
                                            </div>
                                        </div>
                                    </div>
                                    
                                </div>
                                <div class="modal-footer">
                                    <button type="button" class="btn btn-secondary" data-bs-dismiss="modal">
                                        <i class="bi bi-x-circle me-1"></i> Cancel / 取消
                                    </button>
                                    <button type="submit" class="btn btn-success">
                                        <i class="bi bi-check-circle me-1"></i> Add Devotee / 添加信徒
                                    </button>
                                </div>
                            </form>
                        </div>
                    </div>
                </div>
            `;

      $("#addDevoteeModal").remove();
      $("body").append(modalHtml);
      const modal = new bootstrap.Modal(
        document.getElementById("addDevoteeModal")
      );
      modal.show();

      // ========================================
      // EVENT HANDLERS FOR ADD MODAL
      // ========================================

      // Head of Family checkbox toggle
      $("#addIsHeadOfFamily").on("change", function () {
        if ($(this).is(":checked")) {
          $("#addFamilyMembersSection").slideDown(300);
        } else {
          $("#addFamilyMembersSection").slideUp(300);
          // Clear family members when unchecked
          self.familyMembers = [];
          self.familyMemberIndex = 0;
          $("#addFamilyMembersList").html(`
                        <div class="text-center text-muted py-3" id="addNoFamilyMembersMsg">
                            <i class="bi bi-people d-block fs-3 mb-2"></i>
                            No family members added yet. Click "Add Member" to add.<br>
                            还没有添加家庭成员。点击"添加成员"来添加。
                        </div>
                    `);
        }
      });

      // Add Family Member button
      $("#btnAddFamilyMemberAdd").on("click", function () {
        self.addFamilyMemberRow("add");
      });

      // Remove Family Member (delegated event)
      $("#addDevoteeModal").on(
        "click",
        ".btn-remove-family-member",
        function () {
          const index = $(this).data("index");
          self.removeFamilyMember(index, "add");
        }
      );

      // NRIC Search button
      $("#btnSearchNricAdd").on("click", function () {
        self.searchNricForFamily("add");
      });

      // NRIC input - search on Enter
      $("#addNricInput").on("keypress", function (e) {
        if (e.which === 13) {
          e.preventDefault();
          self.searchNricForFamily("add");
        }
      });

      // Form submit
      $("#addDevoteeForm").on("submit", function (e) {
        e.preventDefault();
        self.submitAddDevoteeForm(modal);
      });

      // Cleanup on modal close
      $("#addDevoteeModal").on("hidden.bs.modal", function () {
        self.familyMembers = [];
        self.familyMemberIndex = 0;
        $(this).remove();
      });
    },

    // ============================================
    // Add a family member row
    // ============================================
    addFamilyMemberRow: function (prefix) {
      const self = this;
      const index = self.familyMemberIndex++;
      const listId =
        prefix === "add" ? "#addFamilyMembersList" : "#editFamilyMembersList";
      const noMsgId =
        prefix === "add" ? "#addNoFamilyMembersMsg" : "#editNoFamilyMembersMsg";

      // Hide "no members" message
      $(noMsgId).hide();

      const memberHtml = `
                <div class="family-member-row border rounded p-3 mb-3 bg-light" data-index="${index}">
                    <div class="d-flex justify-content-between align-items-center mb-3">
                        <span class="badge bg-primary">Family Member #${
                          index + 1
                        } / 家庭成员 #${index + 1}</span>
                        <button type="button" class="btn btn-sm btn-outline-danger btn-remove-family-member" data-index="${index}">
                            <i class="bi bi-trash"></i> Remove / 删除
                        </button>
                    </div>
                    <div class="row g-3">
                        <div class="col-md-6">
                            <label class="form-label">Name / 姓名 <span class="text-danger">*</span></label>
                            <input type="text" class="form-control form-control-sm" name="family_name_${index}" required
                                   placeholder="Full name / 全名">
                        </div>
                        <div class="col-md-6">
                            <label class="form-label">NRIC / 身份证 <span class="text-danger">*</span></label>
                            <input type="text" class="form-control form-control-sm" name="family_nric_${index}" required
                                   placeholder="IC Number / 身份证号码">
                        </div>
                        <div class="col-md-4">
                            <label class="form-label">Date of Birth / 出生日期</label>
                            <input type="date" class="form-control form-control-sm" name="family_dob_${index}">
                        </div>
                        <div class="col-md-4">
                            <label class="form-label">Gender / 性别</label>
                            <select class="form-select form-select-sm" name="family_gender_${index}">
                                <option value="">-- Select --</option>
                                <option value="male">Male / 男</option>
                                <option value="female">Female / 女</option>
                            </select>
                        </div>
                        <div class="col-md-4">
                            <label class="form-label">Relationship / 关系 <span class="text-danger">*</span></label>
                            <select class="form-select form-select-sm" name="family_relationship_${index}" required>
                                <option value="">-- Select / 选择 --</option>
                                <option value="spouse">Spouse / 配偶</option>
                                <option value="father">Father / 父亲</option>
                                <option value="mother">Mother / 母亲</option>
                                <option value="son">Son / 儿子</option>
                                <option value="daughter">Daughter / 女儿</option>
                                <option value="brother">Brother / 兄弟</option>
                                <option value="sister">Sister / 姐妹</option>
                                <option value="grandfather">Grandfather / 祖父</option>
                                <option value="grandmother">Grandmother / 祖母</option>
                                <option value="grandson">Grandson / 孙子</option>
                                <option value="granddaughter">Granddaughter / 孙女</option>
                                <option value="father_in_law">Father-in-law / 岳父/公公</option>
                                <option value="mother_in_law">Mother-in-law / 岳母/婆婆</option>
                                <option value="son_in_law">Son-in-law / 女婿</option>
                                <option value="daughter_in_law">Daughter-in-law / 媳妇</option>
                                <option value="uncle">Uncle / 叔伯舅</option>
                                <option value="aunt">Aunt / 姑姨婶</option>
                                <option value="nephew">Nephew / 侄子/外甥</option>
                                <option value="niece">Niece / 侄女/外甥女</option>
                                <option value="cousin">Cousin / 表/堂兄弟姐妹</option>
                                <option value="other">Other / 其他</option>
                            </select>
                        </div>
                    </div>
                </div>
            `;

      $(listId).append(memberHtml);

      // Store in array for tracking
      self.familyMembers.push({ index: index });
    },

    // ============================================
    // Remove a family member row
    // ============================================
    removeFamilyMember: function (index, prefix) {
      const self = this;
      const noMsgId =
        prefix === "add" ? "#addNoFamilyMembersMsg" : "#editNoFamilyMembersMsg";

      $(`.family-member-row[data-index="${index}"]`).fadeOut(300, function () {
        $(this).remove();

        // Remove from tracking array
        self.familyMembers = self.familyMembers.filter(
          (m) => m.index !== index
        );

        // Show "no members" message if empty
        if (self.familyMembers.length === 0) {
          $(noMsgId).show();
        }
      });
    },

    // ============================================
    // Search NRIC for existing devotee or family
    // ============================================
    searchNricForFamily: function (prefix) {
      const self = this;
      const nricInputId = prefix === "add" ? "#addNricInput" : "#editNricInput";
      const resultId =
        prefix === "add" ? "#addNricSearchResult" : "#editNricSearchResult";
      const nric = $(nricInputId).val().trim();

      if (!nric || nric.length < 5) {
        TempleUtils.showWarning("Please enter a valid NRIC");
        return;
      }

      $(resultId).html(
        '<span class="text-info"><i class="bi bi-hourglass-split me-1"></i>Searching...</span>'
      );

      // Search for existing devotee with this NRIC
      PagodaAPI.devotees
        .search(nric)
        .done(function (response) {
          if (response.success && response.data && response.data.length > 0) {
            const devotee = response.data[0];

            // Check if this is a head of family
            if (
              devotee.is_head_of_family &&
              devotee.family_members &&
              devotee.family_members.length > 0
            ) {
              self.autoFillHeadOfFamily(devotee, prefix);
            } else if (devotee.head_of_family_id) {
              self.autoFillFromFamilyMember(devotee, prefix);
            } else {
              self.autoFillDevotee(devotee, prefix);
            }
          } else {
            $(resultId).html(
              '<span class="text-success"><i class="bi bi-check-circle me-1"></i>New NRIC - No existing record found</span>'
            );
            setTimeout(() => $(resultId).empty(), 3000);
          }
        })
        .fail(function () {
          $(resultId).html(
            '<span class="text-success"><i class="bi bi-check-circle me-1"></i>New NRIC</span>'
          );
          setTimeout(() => $(resultId).empty(), 3000);
        });
    },

    // ============================================
    // Auto-fill devotee details
    // ============================================
    autoFillDevotee: function (devotee, prefix) {
      const p = prefix === "add" ? "#add" : "#edit";

      $(p + "NameEnglish").val(devotee.name_english || "");
      $(p + "NameChinese").val(devotee.name_chinese || "");
      $(p + "ContactNo").val(devotee.contact_no || "");
      $(p + "Email").val(devotee.email || "");
      $(p + "Address").val(devotee.address || "");
      $(p + "DateOfBirth").val(devotee.date_of_birth || "");
      $(p + "Gender").val(devotee.gender || "");

      const resultId =
        prefix === "add" ? "#addNricSearchResult" : "#editNricSearchResult";
      $(resultId).html(`
                <span class="text-warning">
                    <i class="bi bi-exclamation-triangle me-1"></i>
                    Existing devotee found: <strong>${devotee.name_english}</strong>
                </span>
            `);

      TempleUtils.showInfo("Existing devotee found - details auto-filled");
    },

    // ============================================
    // Auto-fill when head of family is found
    // ============================================
    autoFillHeadOfFamily: function (devotee, prefix) {
      const self = this;

      // Fill head of family details
      self.autoFillDevotee(devotee, prefix);

      // Check the head of family checkbox
      const checkboxId =
        prefix === "add" ? "#addIsHeadOfFamily" : "#editIsHeadOfFamily";
      $(checkboxId).prop("checked", true).trigger("change");

      // Load existing family members
      if (devotee.family_members && devotee.family_members.length > 0) {
        const listId =
          prefix === "add" ? "#addFamilyMembersList" : "#editFamilyMembersList";
        const noMsgId =
          prefix === "add"
            ? "#addNoFamilyMembersMsg"
            : "#editNoFamilyMembersMsg";

        // Clear existing family member rows
        self.familyMembers = [];
        self.familyMemberIndex = 0;
        $(listId).find(".family-member-row").remove();
        $(noMsgId).hide();

        // Add each family member
        devotee.family_members.forEach(function (member) {
          self.addFamilyMemberRow(prefix);
          const index = self.familyMemberIndex - 1;

          // Fill the row with member data
          $(`input[name="family_name_${index}"]`).val(
            member.name || member.name_english || ""
          );
          $(`input[name="family_nric_${index}"]`).val(member.nric || "");
          $(`input[name="family_dob_${index}"]`).val(
            member.date_of_birth || ""
          );
          $(`select[name="family_gender_${index}"]`).val(member.gender || "");
          $(`select[name="family_relationship_${index}"]`).val(
            member.relationship || ""
          );
        });

        TempleUtils.showInfo(
          `Found head of family with ${devotee.family_members.length} family member(s)`
        );
      }
    },

    // ============================================
    // Auto-fill when a family member NRIC is entered
    // ============================================
    autoFillFromFamilyMember: function (devotee, prefix) {
      const self = this;
      const resultId =
        prefix === "add" ? "#addNricSearchResult" : "#editNricSearchResult";

      // Load the head of family
      PagodaAPI.devotees
        .getById(devotee.head_of_family_id)
        .done(function (response) {
          if (response.success && response.data) {
            const headOfFamily = response.data.devotee || response.data;

            // Fill head of family details
            self.autoFillHeadOfFamily(headOfFamily, prefix);

            $(resultId).html(`
                            <span class="text-info">
                                <i class="bi bi-diagram-3 me-1"></i>
                                This NRIC belongs to a family member of <strong>${headOfFamily.name_english}</strong>
                            </span>
                        `);

            TempleUtils.showInfo("Family member found - loaded entire family");
          }
        });
    },

    // ============================================
    // Submit Add Devotee Form
    // ============================================
    submitAddDevoteeForm: function (modal) {
      const self = this;

      // Collect main devotee data
      const formData = {
        name_english: $("#addNameEnglish").val().trim(),
        name_chinese: $("#addNameChinese").val().trim(),
        nric: $("#addNricInput").val().trim(),
        contact_no: $("#addContactNo").val().trim(),
        email: $("#addEmail").val().trim(),
        address: $("#addAddress").val().trim(),
        date_of_birth: $("#addDateOfBirth").val() || null,
        gender: $("#addGender").val() || null,
        is_head_of_family: $("#addIsHeadOfFamily").is(":checked"),
        family_members: [],
      };

      // Collect family members if head of family
      if (formData.is_head_of_family) {
        $(".family-member-row").each(function () {
          const index = $(this).data("index");
          const member = {
            name: $(`input[name="family_name_${index}"]`).val().trim(),
            nric: $(`input[name="family_nric_${index}"]`).val().trim(),
            date_of_birth: $(`input[name="family_dob_${index}"]`).val() || null,
            gender: $(`select[name="family_gender_${index}"]`).val() || null,
            relationship: $(
              `select[name="family_relationship_${index}"]`
            ).val(),
          };

          if (member.name && member.nric) {
            formData.family_members.push(member);
          }
        });
      }

      console.log("Submitting devotee data:", formData);

      TempleUtils.showLoading("Adding devotee...");

      PagodaAPI.devotees
        .create(formData)
        .done(function (response) {
          if (response.success) {
            const memberCount = formData.family_members.length;
            const message =
              memberCount > 0
                ? `Devotee added successfully with ${memberCount} family member(s)`
                : "Devotee added successfully";

            TempleUtils.showSuccess(message);
            modal.hide();
            self.loadDevotees();
            self.loadStatistics();
          }
        })
        .fail(function (xhr) {
          TempleUtils.handleAjaxError(xhr, "Failed to add devotee");
        })
        .always(function () {
          TempleUtils.hideLoading();
        });
    },

    // ============================================
    // Get relationship display name
    // ============================================
    getRelationshipDisplay: function (relationship) {
      const relationships = {
        spouse: "Spouse / 配偶",
        father: "Father / 父亲",
        mother: "Mother / 母亲",
        son: "Son / 儿子",
        daughter: "Daughter / 女儿",
        brother: "Brother / 兄弟",
        sister: "Sister / 姐妹",
        grandfather: "Grandfather / 祖父",
        grandmother: "Grandmother / 祖母",
        grandson: "Grandson / 孙子",
        granddaughter: "Granddaughter / 孙女",
        father_in_law: "Father-in-law / 岳父",
        mother_in_law: "Mother-in-law / 岳母",
        son_in_law: "Son-in-law / 女婿",
        daughter_in_law: "Daughter-in-law / 媳妇",
        uncle: "Uncle / 叔伯舅",
        aunt: "Aunt / 姑姨婶",
        nephew: "Nephew / 侄子",
        niece: "Niece / 侄女",
        cousin: "Cousin / 表兄弟姐妹",
        other: "Other / 其他",
      };
      return relationships[relationship] || relationship;
    },

    // Edit devotee
    editDevotee: function (id) {
      const self = this;

      $(".modal").modal("hide");

      TempleUtils.showLoading("Loading devotee...");

      PagodaAPI.devotees
        .getById(id)
        .done(function (response) {
          if (response.success && response.data) {
            self.showEditDevoteeModal(response.data);
          }
        })
        .fail(function (xhr) {
          TempleUtils.handleAjaxError(xhr, "Failed to load devotee");
        })
        .always(function () {
          TempleUtils.hideLoading();
        });
    },

    // Show edit devotee modal
    showEditDevoteeModal: function (data) {
      const self = this;
      const devotee = data.devotee || data;
      const familyMembers = data.family_members || [];

      // Reset family members tracking
      self.familyMembers = [];
      self.familyMemberIndex = 0;

      const modalHtml = `
                <div class="modal fade" id="editDevoteeModal" tabindex="-1">
                    <div class="modal-dialog modal-lg modal-dialog-scrollable">
                        <div class="modal-content">
                            <div class="modal-header bg-primary text-white">
                                <h5 class="modal-title">
                                    <i class="bi bi-pencil me-2"></i>
                                    Edit Devotee / 编辑信徒
                                </h5>
                                <button type="button" class="btn-close btn-close-white" data-bs-dismiss="modal"></button>
                            </div>
                            <form id="editDevoteeForm">
                                <div class="modal-body">
                                    
                                    <!-- Personal Information Section -->
                                    <div class="card mb-4">
                                        <div class="card-header bg-light">
                                            <h6 class="mb-0">
                                                <i class="bi bi-person-badge me-2 text-primary"></i>
                                                Personal Information / 个人资料
                                            </h6>
                                        </div>
                                        <div class="card-body">
                                            <div class="row g-3">
                                                <div class="col-md-6">
                                                    <label class="form-label">Name (English) <span class="text-danger">*</span></label>
                                                    <input type="text" class="form-control" name="name_english" id="editNameEnglish" 
                                                           value="${
                                                             devotee.name_english ||
                                                             ""
                                                           }" required>
                                                </div>
                                                <div class="col-md-6">
                                                    <label class="form-label">Name (Chinese)</label>
                                                    <input type="text" class="form-control" name="name_chinese" id="editNameChinese"
                                                           value="${
                                                             devotee.name_chinese ||
                                                             ""
                                                           }">
                                                </div>
                                                <div class="col-md-6">
                                                    <label class="form-label">NRIC <span class="text-danger">*</span></label>
                                                    <input type="text" class="form-control" name="nric" id="editNricInput"
                                                           value="${
                                                             devotee.nric || ""
                                                           }" required>
                                                </div>
                                                <div class="col-md-6">
                                                    <label class="form-label">Date of Birth</label>
                                                    <input type="date" class="form-control" name="date_of_birth" id="editDateOfBirth"
                                                           value="${
                                                             devotee.date_of_birth ||
                                                             ""
                                                           }">
                                                </div>
                                                <div class="col-md-6">
                                                    <label class="form-label">Gender</label>
                                                    <select class="form-select" name="gender" id="editGender">
                                                        <option value="">-- Select --</option>
                                                        <option value="male" ${
                                                          devotee.gender ===
                                                          "male"
                                                            ? "selected"
                                                            : ""
                                                        }>Male / 男</option>
                                                        <option value="female" ${
                                                          devotee.gender ===
                                                          "female"
                                                            ? "selected"
                                                            : ""
                                                        }>Female / 女</option>
                                                    </select>
                                                </div>
                                                <div class="col-md-6">
                                                    <label class="form-label">Contact Number <span class="text-danger">*</span></label>
                                                    <input type="tel" class="form-control" name="contact_no" id="editContactNo"
                                                           value="${
                                                             devotee.contact_no ||
                                                             ""
                                                           }" required>
                                                </div>
                                                <div class="col-md-6">
                                                    <label class="form-label">Email</label>
                                                    <input type="email" class="form-control" name="email" id="editEmail"
                                                           value="${
                                                             devotee.email || ""
                                                           }">
                                                </div>
                                                <div class="col-md-6">
                                                    <label class="form-label">Address</label>
                                                    <input type="text" class="form-control" name="address" id="editAddress"
                                                           value="${
                                                             devotee.address ||
                                                             ""
                                                           }">
                                                </div>
                                            </div>
                                        </div>
                                    </div>
                                    
                                    <!-- Head of Family Checkbox -->
                                    <div class="card mb-4">
                                        <div class="card-body">
                                            <div class="form-check form-switch">
                                                <input class="form-check-input" type="checkbox" id="editIsHeadOfFamily" 
                                                       style="transform: scale(1.3);" ${
                                                         devotee.is_head_of_family
                                                           ? "checked"
                                                           : ""
                                                       }>
                                                <label class="form-check-label ms-2" for="editIsHeadOfFamily">
                                                    <strong>Head of Family / 一家之主</strong>
                                                </label>
                                            </div>
                                        </div>
                                    </div>
                                    
                                    <!-- Family Members Section -->
                                    <div id="editFamilyMembersSection" class="card mb-3" style="display: ${
                                      devotee.is_head_of_family
                                        ? "block"
                                        : "none"
                                    };">
                                        <div class="card-header bg-warning bg-opacity-25 d-flex justify-content-between align-items-center">
                                            <h6 class="mb-0">
                                                <i class="bi bi-people me-2 text-warning"></i>
                                                Family Members / 家庭成员
                                            </h6>
                                            <button type="button" class="btn btn-sm btn-success" id="btnAddFamilyMemberEdit">
                                                <i class="bi bi-plus-circle me-1"></i> Add Member
                                            </button>
                                        </div>
                                        <div class="card-body">
                                            <div id="editFamilyMembersList">
                                                <div class="text-center text-muted py-3" id="editNoFamilyMembersMsg" style="display: ${
                                                  familyMembers.length > 0
                                                    ? "none"
                                                    : "block"
                                                };">
                                                    <i class="bi bi-people d-block fs-3 mb-2"></i>
                                                    No family members added yet.
                                                </div>
                                            </div>
                                        </div>
                                    </div>
                                    
                                </div>
                                <div class="modal-footer">
                                    <button type="button" class="btn btn-secondary" data-bs-dismiss="modal">Cancel</button>
                                    <button type="submit" class="btn btn-primary">
                                        <i class="bi bi-check-circle"></i> Update Devotee
                                    </button>
                                </div>
                            </form>
                        </div>
                    </div>
                </div>
            `;

      $("#editDevoteeModal").remove();
      $("body").append(modalHtml);
      const modal = new bootstrap.Modal(
        document.getElementById("editDevoteeModal")
      );
      modal.show();

      // Load existing family members
      if (familyMembers.length > 0) {
        familyMembers.forEach(function (member) {
          self.addFamilyMemberRow("edit");
          const index = self.familyMemberIndex - 1;

          $(`input[name="family_name_${index}"]`).val(
            member.name || member.name_english || ""
          );
          $(`input[name="family_nric_${index}"]`).val(member.nric || "");
          $(`input[name="family_dob_${index}"]`).val(
            member.date_of_birth || ""
          );
          $(`select[name="family_gender_${index}"]`).val(member.gender || "");
          $(`select[name="family_relationship_${index}"]`).val(
            member.relationship || ""
          );
        });
      }

      // Event handlers
      $("#editIsHeadOfFamily").on("change", function () {
        if ($(this).is(":checked")) {
          $("#editFamilyMembersSection").slideDown(300);
        } else {
          $("#editFamilyMembersSection").slideUp(300);
        }
      });

      $("#btnAddFamilyMemberEdit").on("click", function () {
        self.addFamilyMemberRow("edit");
      });

      $("#editDevoteeModal").on(
        "click",
        ".btn-remove-family-member",
        function () {
          const index = $(this).data("index");
          self.removeFamilyMember(index, "edit");
        }
      );

      // Form submit
      $("#editDevoteeForm").on("submit", function (e) {
        e.preventDefault();

        const formData = {
          name_english: $("#editNameEnglish").val().trim(),
          name_chinese: $("#editNameChinese").val().trim(),
          nric: $("#editNricInput").val().trim(),
          contact_no: $("#editContactNo").val().trim(),
          email: $("#editEmail").val().trim(),
          address: $("#editAddress").val().trim(),
          date_of_birth: $("#editDateOfBirth").val() || null,
          gender: $("#editGender").val() || null,
          is_head_of_family: $("#editIsHeadOfFamily").is(":checked"),
          family_members: [],
        };

        // Collect family members
        if (formData.is_head_of_family) {
          $(".family-member-row").each(function () {
            const index = $(this).data("index");
            const member = {
              name: $(`input[name="family_name_${index}"]`).val().trim(),
              nric: $(`input[name="family_nric_${index}"]`).val().trim(),
              date_of_birth:
                $(`input[name="family_dob_${index}"]`).val() || null,
              gender: $(`select[name="family_gender_${index}"]`).val() || null,
              relationship: $(
                `select[name="family_relationship_${index}"]`
              ).val(),
            };

            if (member.name && member.nric) {
              formData.family_members.push(member);
            }
          });
        }

        TempleUtils.showLoading("Updating devotee...");

        PagodaAPI.devotees
          .update(devotee.id, formData)
          .done(function (response) {
            if (response.success) {
              TempleUtils.showSuccess("Devotee updated successfully");
              modal.hide();
              self.loadDevotees();
              self.loadStatistics();
            }
          })
          .fail(function (xhr) {
            TempleUtils.handleAjaxError(xhr, "Failed to update devotee");
          })
          .always(function () {
            TempleUtils.hideLoading();
          });
      });

      $("#editDevoteeModal").on("hidden.bs.modal", function () {
        self.familyMembers = [];
        self.familyMemberIndex = 0;
        $(this).remove();
      });
    },

    // New registration for devotee
    newRegistrationForDevotee: function (devoteeId) {
      sessionStorage.setItem("selected_devotee_id", devoteeId);
      $(".modal").modal("hide");
      setTimeout(function () {
        TempleRouter.navigate("auspicious-light/entry");
      }, 300);
    },

    // Export devotees
    exportDevotees: function () {
      TempleUtils.showInfo("Export functionality coming soon");
    },

    // Cleanup
    destroy: function () {
      console.log("Cleaning up Pagoda Devotees Management page");

      this.detachEvents();

      this.currentFilters = {};
      this.currentPage = 1;
      this.perPage = 25;
      this.familyMembers = [];
      this.familyMemberIndex = 0;
      this.params = null;

      $("#devoteeModal").remove();
      $("#addDevoteeModal").remove();
      $("#editDevoteeModal").remove();
      $(".modal-backdrop").remove();
      $("body").removeClass("modal-open").css("overflow", "");

      $("#page-container").empty();

      console.log("Pagoda Devotees Management page cleaned up");
    },
  };
})(jQuery, window);
