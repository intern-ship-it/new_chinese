// frontend/js/pages/members/reports.js
// Member Reports Page with Advanced Filters and Print

(function ($, window) {
  "use strict";

  window.MembersReportsPage = {
    currentUser: null,
    members: [],
    statistics: {},
    filterOptions: {},
    currentPage: 1,
    totalPages: 1,
    currentFilters: {
      member_type_id: "",
      status: "",
      subscription_status: "",
      gender: "",
      city: "",
      state: "",
      membership_from: "",
      membership_to: "",
      search: "",
      sort_by: "created_at",
      sort_order: "desc",
      per_page: 20,
    },

    // Initialize page
    init: function () {
      this.currentUser = JSON.parse(
        localStorage.getItem(window.APP_CONFIG.STORAGE.USER) || "{}"
      );

      this.render();
      this.bindEvents();
      this.loadFilterOptions();
      this.loadStatistics();
      this.loadMembers();
      this.initAnimations();
    },

    // Initialize animations
    initAnimations: function () {
      if (typeof AOS !== "undefined") {
        AOS.init({
          duration: 600,
          easing: "ease-in-out",
          once: false,
        });
      }
    },

    // Render page HTML
    render: function () {
      const html = `
                <div class="members-reports-page">
                    <!-- Page Header -->
                    <div class="page-header mb-4">
                        <div class="row align-items-center">
                            <div class="col-md-6">
                                <h1 class="h2">
                                    <i class="bi bi-file-earmark-bar-graph"></i> Member Reports
                                </h1>
                                <nav aria-label="breadcrumb">
                                    <ol class="breadcrumb">
                                        <li class="breadcrumb-item"><a href="#" onclick="TempleRouter.navigate('dashboard'); return false;">Dashboard</a></li>
                                        <li class="breadcrumb-item"><a href="#" onclick="TempleRouter.navigate('members'); return false;">Members</a></li>
                                        <li class="breadcrumb-item active">Reports</li>
                                    </ol>
                                </nav>
                            </div>
                            <div class="col-md-6 text-md-end">
                                <div class="btn-group">
                                    <button class="btn btn-secondary" id="btnPrint">
                                        <i class="bi bi-printer"></i> Print
                                    </button>
                                    <button class="btn btn-success" id="exportExcel">
                                        <i class="bi bi-file-excel"></i> Export Excel
                                    </button>
                                    <button class="btn btn-danger" id="exportPdf">
                                        <i class="bi bi-file-pdf"></i> Export PDF
                                    </button>
                                    <button class="btn btn-info" id="exportCsv">
                                        <i class="bi bi-file-csv"></i> Export CSV
                                    </button>
                                </div>
                            </div>
                        </div>
                    </div>

                    <!-- Statistics Cards -->
                    <div class="row g-3 mb-4" id="statisticsCards">
                        <!-- Statistics will be loaded here -->
                    </div>

                    <!-- Filters Card -->
                    <div class="card border-0 shadow-sm mb-4" data-aos="fade-up">
                        <div class="card-header bg-primary text-white">
                            <h5 class="mb-0">
                                <i class="bi bi-funnel"></i> Filters
                                <button class="btn btn-sm btn-light float-end" id="btnResetFilters">
                                    <i class="bi bi-arrow-clockwise"></i> Reset
                                </button>
                            </h5>
                        </div>
                        <div class="card-body">
                            <div class="row g-3">
                                <!-- Search -->
                                <div class="col-md-4">
                                    <label class="form-label">Search</label>
                                    <input type="text" class="form-control" id="filterSearch" 
                                           placeholder="Name, Email, Mobile, Member Code...">
                                </div>

                                <!-- Member Type -->
                                <div class="col-md-4">
                                    <label class="form-label">Member Type</label>
                                    <select class="form-select" id="filterMemberType">
                                        <option value="">All Types</option>
                                    </select>
                                </div>

                                <!-- Status -->
                                <div class="col-md-4">
                                    <label class="form-label">Status</label>
                                    <select class="form-select" id="filterStatus">
                                        <option value="">All Status</option>
                                        <option value="active">Active</option>
                                        <option value="inactive">Inactive</option>
                                    </select>
                                </div>

                                <!-- Subscription Status -->
                                <div class="col-md-4">
                                    <label class="form-label">Subscription Status</label>
                                    <select class="form-select" id="filterSubscriptionStatus">
                                        <option value="">All</option>
                                        <option value="ACTIVE">Active</option>
                                        <option value="EXPIRED">Expired</option>
                                        <option value="INACTIVE">Inactive</option>
                                        <option value="PENDING">Pending</option>
                                    </select>
                                </div>

                                <!-- Gender -->
                                <div class="col-md-4">
                                    <label class="form-label">Gender</label>
                                    <select class="form-select" id="filterGender">
                                        <option value="">All</option>
                                        <option value="MALE">Male</option>
                                        <option value="FEMALE">Female</option>
                                        <option value="OTHER">Other</option>
                                    </select>
                                </div>

                                <!-- City -->
                                <div class="col-md-4">
                                    <label class="form-label">City</label>
                                    <select class="form-select" id="filterCity">
                                        <option value="">All Cities</option>
                                    </select>
                                </div>

                                <!-- State -->
                                <div class="col-md-4">
                                    <label class="form-label">State</label>
                                    <select class="form-select" id="filterState">
                                        <option value="">All States</option>
                                    </select>
                                </div>

                                <!-- Membership Date From -->
                                <div class="col-md-4">
                                    <label class="form-label">Membership From</label>
                                    <input type="date" class="form-control" id="filterMembershipFrom">
                                </div>

                                <!-- Membership Date To -->
                                <div class="col-md-4">
                                    <label class="form-label">Membership To</label>
                                    <input type="date" class="form-control" id="filterMembershipTo">
                                </div>

                                <!-- Apply Button -->
                                <div class="col-12">
                                    <button class="btn btn-primary" id="btnApplyFilters">
                                        <i class="bi bi-check-circle"></i> Apply Filters
                                    </button>
                                    <button class="btn btn-outline-secondary ms-2" id="btnClearFilters">
                                        <i class="bi bi-x-circle"></i> Clear
                                    </button>
                                </div>
                            </div>
                        </div>
                    </div>

                    <!-- Members Table -->
                    <div class="card border-0 shadow-sm" data-aos="fade-up" data-aos-delay="100">
                        <div class="card-header bg-white">
                            <div class="row align-items-center">
                                <div class="col-md-6">
                                    <h5 class="mb-0">
                                        <i class="bi bi-people"></i> Members List
                                        <span class="badge bg-primary ms-2" id="totalMembersCount">0</span>
                                    </h5>
                                </div>
                                <div class="col-md-6 text-md-end">
                                    <div class="btn-group btn-group-sm">
                                        <button class="btn btn-outline-secondary" id="btnRefresh">
                                            <i class="bi bi-arrow-clockwise"></i> Refresh
                                        </button>
                                    </div>
                                </div>
                            </div>
                        </div>
                        <div class="card-body p-0">
                            <!-- Loading State -->
                            <div id="loadingState" class="text-center py-5">
                                <div class="spinner-border text-primary" role="status">
                                    <span class="visually-hidden">Loading...</span>
                                </div>
                                <p class="mt-3 text-muted">Loading members...</p>
                            </div>

                            <!-- Table -->
                            <div id="membersTableContainer" style="display: none;">
                                <div class="table-responsive">
                                    <table class="table table-hover mb-0">
                                        <thead class="table-light">
                                            <tr>
                                                <th>#</th>
                                                <th>Member Code</th>
                                                <th>Name</th>
                                                <th>Email</th>
                                                <th>Mobile</th>
                                                <th>Member Type</th>
                                                <th>Gender</th>
                                                <th>City</th>
                                                <th>Membership Date</th>
                                                <th>Subscription</th>
                                                <th>Status</th>
                                                <th>Actions</th>
                                            </tr>
                                        </thead>
                                        <tbody id="membersTableBody">
                                            <!-- Rows will be inserted here -->
                                        </tbody>
                                    </table>
                                </div>

                                <!-- Pagination -->
                                <div class="card-footer bg-white">
                                    <div class="row align-items-center">
                                        <div class="col-md-6">
                                            <div class="d-flex align-items-center">
                                                <label class="me-2">Per Page:</label>
                                                <select class="form-select form-select-sm" id="perPageSelect" style="width: 80px;">
                                                    <option value="10">10</option>
                                                    <option value="20" selected>20</option>
                                                    <option value="50">50</option>
                                                    <option value="100">100</option>
                                                </select>
                                            </div>
                                        </div>
                                        <div class="col-md-6">
                                            <nav>
                                                <ul class="pagination pagination-sm justify-content-end mb-0" id="pagination">
                                                    <!-- Pagination will be inserted here -->
                                                </ul>
                                            </nav>
                                        </div>
                                    </div>
                                </div>
                            </div>
                        </div>
                    </div>
                </div>

                <style>
                    .stat-card {
                        border-left: 4px solid;
                        transition: transform 0.2s, box-shadow 0.2s;
                    }
                    
                    .stat-card:hover {
                        transform: translateY(-5px);
                        box-shadow: 0 8px 16px rgba(0,0,0,0.1);
                    }
                    
                    .stat-icon {
                        font-size: 2.5rem;
                        opacity: 0.8;
                    }
                    
                    .table tbody tr {
                        transition: background-color 0.2s;
                    }
                    
                    .table tbody tr:hover {
                        background-color: #f8f9fa;
                    }
                    
                    .status-badge {
                        font-size: 0.85rem;
                        padding: 0.25rem 0.75rem;
                    }
                </style>
            `;

      $("#page-container").html(html);
    },

    // Bind events
    bindEvents: function () {
      const self = this;

      // Apply Filters
      $("#btnApplyFilters").on("click", function () {
        self.applyFilters();
      });

      // Clear Filters
      $("#btnClearFilters").on("click", function () {
        self.clearFilters();
      });

      // Reset Filters
      $("#btnResetFilters").on("click", function () {
        self.resetFilters();
      });

      // Refresh
      $("#btnRefresh").on("click", function () {
        self.loadMembers();
      });

      // Print handler
      $("#btnPrint").on("click", function () {
        self.printReport();
      });

      // Export handlers
      $("#exportExcel").on("click", function () {
        self.exportReport("excel");
      });

      $("#exportPdf").on("click", function () {
        self.exportReport("pdf");
      });

      $("#exportCsv").on("click", function () {
        self.exportReport("csv");
      });

      // Per page change
      $("#perPageSelect").on("change", function () {
        self.currentFilters.per_page = $(this).val();
        self.currentPage = 1;
        self.loadMembers();
      });

      // Search with debounce
      let searchTimeout;
      $("#filterSearch").on("keyup", function () {
        clearTimeout(searchTimeout);
        searchTimeout = setTimeout(function () {
          self.applyFilters();
        }, 500);
      });
    },

    // Load filter options
    loadFilterOptions: function () {
      const self = this;

      TempleAPI.get("/reports/members/filter-options")
        .done(function (response) {
          if (response.success) {
            self.filterOptions = response.data;
            self.populateFilterDropdowns();
          }
        })
        .fail(function (xhr) {
          console.error("Error loading filter options:", xhr);
        });
    },

    // Populate filter dropdowns
    populateFilterDropdowns: function () {
      const options = this.filterOptions;

      // Member Types
      let memberTypeHtml = '<option value="">All Types</option>';
      if (options.member_types) {
        options.member_types.forEach(function (type) {
          const paidBadge = type.is_paid ? " (Paid)" : " (Free)";
          memberTypeHtml += `<option value="${type.id}">${type.display_name}${paidBadge}</option>`;
        });
      }
      $("#filterMemberType").html(memberTypeHtml);

      // Cities
      let cityHtml = '<option value="">All Cities</option>';
      if (options.cities) {
        options.cities.forEach(function (city) {
          cityHtml += `<option value="${city}">${city}</option>`;
        });
      }
      $("#filterCity").html(cityHtml);

      // States
      let stateHtml = '<option value="">All States</option>';
      if (options.states) {
        options.states.forEach(function (state) {
          stateHtml += `<option value="${state}">${state}</option>`;
        });
      }
      $("#filterState").html(stateHtml);
    },

    // Load statistics
    loadStatistics: function () {
      const self = this;

      TempleAPI.get("/reports/members/statistics")
        .done(function (response) {
          if (response.success) {
            self.statistics = response.data;
            self.displayStatistics();
          }
        })
        .fail(function (xhr) {
          console.error("Error loading statistics:", xhr);
        });
    },

    // Display statistics
    displayStatistics: function () {
      const stats = this.statistics;

      const html = `
                <div class="col-md-3" data-aos="fade-up">
                    <div class="card border-0 shadow-sm stat-card" style="border-left-color: #0d6efd;">
                        <div class="card-body">
                            <div class="d-flex justify-content-between align-items-center">
                                <div>
                                    <h6 class="text-muted mb-2">Total Members</h6>
                                    <h2 class="mb-0">${
                                      stats.total_members || 0
                                    }</h2>
                                </div>
                                <div class="stat-icon text-primary">
                                    <i class="bi bi-people-fill"></i>
                                </div>
                            </div>
                        </div>
                    </div>
                </div>

                <div class="col-md-3" data-aos="fade-up" data-aos-delay="100">
                    <div class="card border-0 shadow-sm stat-card" style="border-left-color: #198754;">
                        <div class="card-body">
                            <div class="d-flex justify-content-between align-items-center">
                                <div>
                                    <h6 class="text-muted mb-2">Active Members</h6>
                                    <h2 class="mb-0">${
                                      stats.active_members || 0
                                    }</h2>
                                </div>
                                <div class="stat-icon text-success">
                                    <i class="bi bi-person-check-fill"></i>
                                </div>
                            </div>
                        </div>
                    </div>
                </div>

                <div class="col-md-3" data-aos="fade-up" data-aos-delay="200">
                    <div class="card border-0 shadow-sm stat-card" style="border-left-color: #ffc107;">
                        <div class="card-body">
                            <div class="d-flex justify-content-between align-items-center">
                                <div>
                                    <h6 class="text-muted mb-2">Paid Members</h6>
                                    <h2 class="mb-0">${
                                      stats.paid_members || 0
                                    }</h2>
                                </div>
                                <div class="stat-icon text-warning">
                                    <i class="bi bi-credit-card-fill"></i>
                                </div>
                            </div>
                        </div>
                    </div>
                </div>

                <div class="col-md-3" data-aos="fade-up" data-aos-delay="300">
                    <div class="card border-0 shadow-sm stat-card" style="border-left-color: #20c997;">
                        <div class="card-body">
                            <div class="d-flex justify-content-between align-items-center">
                                <div>
                                    <h6 class="text-muted mb-2">New This Month</h6>
                                    <h2 class="mb-0">${
                                      stats.new_this_month || 0
                                    }</h2>
                                </div>
                                <div class="stat-icon text-info">
                                    <i class="bi bi-person-plus-fill"></i>
                                </div>
                            </div>
                        </div>
                    </div>
                </div>
            `;

      $("#statisticsCards").html(html);

      // Animate stat cards
      if (typeof AOS !== "undefined") {
        AOS.refresh();
      }
    },

    // Load members
    loadMembers: function () {
      const self = this;

      // Show loading
      $("#loadingState").show();
      $("#membersTableContainer").hide();

      // Build query parameters
      const params = { ...this.currentFilters };
      params.page = this.currentPage;

      TempleAPI.get("/reports/members", params)
        .done(function (response) {
          if (response.success) {
            self.members = response.data.data;
            self.currentPage = response.data.current_page;
            self.totalPages = response.data.last_page;

            self.displayMembers();
            self.renderPagination();

            // Update count
            $("#totalMembersCount").text(response.data.total);

            // Hide loading, show table
            $("#loadingState").hide();
            $("#membersTableContainer").fadeIn(300);
          }
        })
        .fail(function (xhr) {
          TempleCore.showToast("Failed to load members", "error");
          $("#loadingState").hide();
        });
    },

    // Display members in table
    displayMembers: function () {
      let html = "";

      if (this.members.length === 0) {
        html = `
                    <tr>
                        <td colspan="12" class="text-center py-5">
                            <i class="bi bi-inbox display-4 text-muted"></i>
                            <p class="mt-3 text-muted">No members found</p>
                        </td>
                    </tr>
                `;
      } else {
        this.members.forEach((member, index) => {
          const rowNum =
            (this.currentPage - 1) * this.currentFilters.per_page + index + 1;
          const memberDetails = member.member_details || {};

          // Status badge
          const statusBadge = member.is_active
            ? '<span class="badge bg-success status-badge">Active</span>'
            : '<span class="badge bg-danger status-badge">Inactive</span>';

          // Subscription status
          let subscriptionBadge =
            '<span class="badge bg-secondary status-badge">N/A</span>';
          if (memberDetails.subscription_status) {
            const subStatus = memberDetails.subscription_status;
            if (subStatus === "ACTIVE") {
              subscriptionBadge =
                '<span class="badge bg-success status-badge">Active</span>';
            } else if (subStatus === "EXPIRED") {
              subscriptionBadge =
                '<span class="badge bg-danger status-badge">Expired</span>';
            } else if (subStatus === "INACTIVE") {
              subscriptionBadge =
                '<span class="badge bg-secondary status-badge">Inactive</span>';
            } else if (subStatus === "PENDING") {
              subscriptionBadge =
                '<span class="badge bg-warning status-badge">Pending</span>';
            }
          }

          html += `
                        <tr>
                            <td>${rowNum}</td>
                            <td><strong>${
                              memberDetails.member_code || "-"
                            }</strong></td>
                            <td>${member.name || "-"}</td>
                            <td>${member.email || "-"}</td>
                            <td>${member.mobile_code || ""} ${
            member.mobile_no || "-"
          }</td>
                            <td>${
                              memberDetails.member_type
                                ? memberDetails.member_type.name
                                : "-"
                            }</td>
                            <td>${member.gender || "-"}</td>
                            <td>${member.city || "-"}</td>
                            <td>${this.formatDate(
                              memberDetails.membership_date
                            )}</td>
                            <td>${subscriptionBadge}</td>
                            <td>${statusBadge}</td>
                            <td>
                                <button class="btn btn-sm btn-outline-primary" onclick="MembersReportsPage.viewMember('${
                                  member.id
                                }')">
                                    <i class="bi bi-eye"></i>
                                </button>
                            </td>
                        </tr>
                    `;
        });
      }

      $("#membersTableBody").html(html);
    },

    // Render pagination
    renderPagination: function () {
      if (this.totalPages <= 1) {
        $("#pagination").html("");
        return;
      }

      let html = "";

      // Previous button
      html += `
                <li class="page-item ${
                  this.currentPage === 1 ? "disabled" : ""
                }">
                    <a class="page-link" href="#" onclick="MembersReportsPage.goToPage(${
                      this.currentPage - 1
                    }); return false;">
                        <i class="bi bi-chevron-left"></i>
                    </a>
                </li>
            `;

      // Page numbers
      const startPage = Math.max(1, this.currentPage - 2);
      const endPage = Math.min(this.totalPages, this.currentPage + 2);

      if (startPage > 1) {
        html += `
                    <li class="page-item">
                        <a class="page-link" href="#" onclick="MembersReportsPage.goToPage(1); return false;">1</a>
                    </li>
                `;
        if (startPage > 2) {
          html += `<li class="page-item disabled"><span class="page-link">...</span></li>`;
        }
      }

      for (let i = startPage; i <= endPage; i++) {
        html += `
                    <li class="page-item ${
                      i === this.currentPage ? "active" : ""
                    }">
                        <a class="page-link" href="#" onclick="MembersReportsPage.goToPage(${i}); return false;">${i}</a>
                    </li>
                `;
      }

      if (endPage < this.totalPages) {
        if (endPage < this.totalPages - 1) {
          html += `<li class="page-item disabled"><span class="page-link">...</span></li>`;
        }
        html += `
                    <li class="page-item">
                        <a class="page-link" href="#" onclick="MembersReportsPage.goToPage(${this.totalPages}); return false;">${this.totalPages}</a>
                    </li>
                `;
      }

      // Next button
      html += `
                <li class="page-item ${
                  this.currentPage === this.totalPages ? "disabled" : ""
                }">
                    <a class="page-link" href="#" onclick="MembersReportsPage.goToPage(${
                      this.currentPage + 1
                    }); return false;">
                        <i class="bi bi-chevron-right"></i>
                    </a>
                </li>
            `;

      $("#pagination").html(html);
    },

    // Go to specific page
    goToPage: function (page) {
      if (page < 1 || page > this.totalPages) return;
      this.currentPage = page;
      this.loadMembers();
    },

    // Apply filters
    applyFilters: function () {
      this.currentFilters = {
        member_type_id: $("#filterMemberType").val(),
        status: $("#filterStatus").val(),
        subscription_status: $("#filterSubscriptionStatus").val(),
        gender: $("#filterGender").val(),
        city: $("#filterCity").val(),
        state: $("#filterState").val(),
        membership_from: $("#filterMembershipFrom").val(),
        membership_to: $("#filterMembershipTo").val(),
        search: $("#filterSearch").val(),
        sort_by: this.currentFilters.sort_by,
        sort_order: this.currentFilters.sort_order,
        per_page: this.currentFilters.per_page,
      };

      this.currentPage = 1;
      this.loadMembers();

      // Show success message
      TempleCore.showToast("Filters applied", "success");
    },

    // Clear filters
    clearFilters: function () {
      $("#filterSearch").val("");
      $("#filterMemberType").val("");
      $("#filterStatus").val("");
      $("#filterSubscriptionStatus").val("");
      $("#filterGender").val("");
      $("#filterCity").val("");
      $("#filterState").val("");
      $("#filterMembershipFrom").val("");
      $("#filterMembershipTo").val("");

      this.applyFilters();
    },

    // Reset filters
    resetFilters: function () {
      this.clearFilters();
      TempleCore.showToast("Filters reset", "info");
    },

    // Export report
    exportReport: function (format) {
      const self = this;

      // Show loading
      TempleCore.showLoading(true);

      // Build query parameters with current filters
      const params = { ...this.currentFilters };
      params.format = format;

      // Remove pagination for export (get all)
      delete params.page;
      delete params.per_page;

      // Create form element for file download
      const form = document.createElement("form");
      form.method = "GET";
      form.action = TempleAPI.getApiUrl("/reports/members/export");
      form.style.display = "none";

      // Add parameters as hidden inputs
      Object.keys(params).forEach((key) => {
        if (params[key]) {
          const input = document.createElement("input");
          input.type = "hidden";
          input.name = key;
          input.value = params[key];
          form.appendChild(input);
        }
      });

      document.body.appendChild(form);

      // Submit form to trigger download
      form.submit();

      // Remove form after submission
      setTimeout(() => {
        document.body.removeChild(form);
        TempleCore.showLoading(false);
        TempleCore.showToast(
          `${format.toUpperCase()} export started!`,
          "success"
        );
      }, 500);
    },

    // Print report
    printReport: function () {
      const self = this;

      // Show loading
      TempleCore.showLoading(true);

      // Build query parameters with current filters
      const params = { ...this.currentFilters };

      // Remove pagination to get all records
      delete params.page;
      delete params.per_page;

      // Fetch all members with filters
      TempleAPI.get("/reports/members", params)
        .done(function (response) {
          if (response.success) {
            const allMembers = response.data.data;
            self.openPrintWindow(allMembers);
          }
        })
        .fail(function (xhr) {
          TempleCore.showToast("Failed to load data for printing", "error");
        })
        .always(function () {
          TempleCore.showLoading(false);
        });
    },

    // Open print window
    openPrintWindow: function (members) {
      const statistics = this.statistics;
      const currentDate = new Date().toLocaleDateString("en-GB", {
        day: "2-digit",
        month: "short",
        year: "numeric",
        hour: "2-digit",
        minute: "2-digit",
      });

      // Build table rows
      let tableRows = "";
      members.forEach((member, index) => {
        const memberDetails = member.member_details || {};
        const status = member.is_active ? "Active" : "Inactive";
        const subscriptionStatus = memberDetails.subscription_status || "-";

        tableRows += `
                    <tr>
                        <td>${index + 1}</td>
                        <td>${memberDetails.member_code || "-"}</td>
                        <td>${member.name || "-"}</td>
                        <td>${member.email || "-"}</td>
                        <td>${member.mobile_code || ""} ${
          member.mobile_no || "-"
        }</td>
                        <td>${member.gender || "-"}</td>
                        <td>${
                          memberDetails.member_type
                            ? memberDetails.member_type.name
                            : "-"
                        }</td>
                        <td>${member.city || "-"}</td>
                        <td>${member.state || "-"}</td>
                        <td>${this.formatDate(
                          memberDetails.membership_date
                        )}</td>
                        <td>${subscriptionStatus}</td>
                        <td>${status}</td>
                    </tr>
                `;
      });

      // Create print content with black & white styles
      const printContent = `
                <!DOCTYPE html>
                <html>
                <head>
                    <meta charset="utf-8">
                    <title>Members Report - Print</title>
                    <style>
                        @media print {
                            @page {
                                size: A4 landscape;
                                margin: 15mm;
                            }
                            
                            body {
                                -webkit-print-color-adjust: exact;
                                print-color-adjust: exact;
                            }
                        }

                        * {
                            margin: 0;
                            padding: 0;
                            box-sizing: border-box;
                        }

                        body {
                            font-family: Arial, sans-serif;
                            font-size: 10pt;
                            color: #000;
                            background: #fff;
                        }

                        .print-header {
                            text-align: center;
                            margin-bottom: 20px;
                            padding-bottom: 15px;
                            border-bottom: 2px solid #000;
                        }

                        .print-header h1 {
                            font-size: 20pt;
                            font-weight: bold;
                            margin-bottom: 5px;
                            color: #000;
                        }

                        .print-header p {
                            font-size: 10pt;
                            color: #333;
                            margin: 3px 0;
                        }

                        .stats-row {
                            display: flex;
                            justify-content: space-around;
                            margin: 15px 0;
                            padding: 10px;
                            background: #f5f5f5;
                            border: 1px solid #000;
                        }

                        .stat-box {
                            text-align: center;
                            flex: 1;
                        }

                        .stat-box .label {
                            font-size: 9pt;
                            color: #666;
                            font-weight: normal;
                        }

                        .stat-box .value {
                            font-size: 16pt;
                            font-weight: bold;
                            color: #000;
                        }

                        table {
                            width: 100%;
                            border-collapse: collapse;
                            margin-top: 10px;
                        }

                        table th {
                            background: #000;
                            color: #fff;
                            padding: 8px 4px;
                            text-align: left;
                            font-size: 9pt;
                            font-weight: bold;
                            border: 1px solid #000;
                        }

                        table td {
                            padding: 6px 4px;
                            border: 1px solid #000;
                            font-size: 9pt;
                            color: #000;
                        }

                        table tr:nth-child(even) {
                            background: #f5f5f5;
                        }

                        table tr:nth-child(odd) {
                            background: #fff;
                        }

                        .print-footer {
                            margin-top: 20px;
                            padding-top: 10px;
                            border-top: 1px solid #000;
                            text-align: center;
                            font-size: 8pt;
                            color: #666;
                        }

                        /* Hide on print */
                        .no-print {
                            display: none !important;
                        }

                        /* Ensure black and white printing */
                        @media print {
                            * {
                                color: #000 !important;
                                background: #fff !important;
                            }
                            
                            table th {
                                background: #000 !important;
                                color: #fff !important;
                            }
                            
                            table tr:nth-child(even) {
                                background: #f0f0f0 !important;
                            }

                            .stats-row {
                                background: #f5f5f5 !important;
                            }
                        }
                    </style>
                </head>
                <body>
                    <div class="print-header">
                        <h1>MEMBERS REPORT</h1>
                        <p>Generated on: ${currentDate}</p>
                        <p>Total Members: ${members.length}</p>
                    </div>

                    <div class="stats-row">
                        <div class="stat-box">
                            <div class="label">Total Members</div>
                            <div class="value">${
                              statistics.total_members || 0
                            }</div>
                        </div>
                        <div class="stat-box">
                            <div class="label">Active</div>
                            <div class="value">${
                              statistics.active_members || 0
                            }</div>
                        </div>
                        <div class="stat-box">
                            <div class="label">Inactive</div>
                            <div class="value">${
                              statistics.inactive_members || 0
                            }</div>
                        </div>
                        <div class="stat-box">
                            <div class="label">Paid Members</div>
                            <div class="value">${
                              statistics.paid_members || 0
                            }</div>
                        </div>
                    </div>

                    <table>
                        <thead>
                            <tr>
                                <th>#</th>
                                <th>Member Code</th>
                                <th>Name</th>
                                <th>Email</th>
                                <th>Mobile</th>
                                <th>Gender</th>
                                <th>Member Type</th>
                                <th>City</th>
                                <th>State</th>
                                <th>Membership Date</th>
                                <th>Subscription</th>
                                <th>Status</th>
                            </tr>
                        </thead>
                        <tbody>
                            ${tableRows}
                        </tbody>
                    </table>

                    <div class="print-footer">
                        <p>This is a system-generated report | © ${new Date().getFullYear()} Temple Management System</p>
                        <p>Printed on: ${currentDate}</p>
                    </div>

                    <script>
                        // Auto-trigger print dialog when window loads
                        window.onload = function() {
                            window.print();
                            
                            // Close window after printing or canceling
                            window.onafterprint = function() {
                                window.close();
                            };
                        };
                    </script>
                </body>
                </html>
            `;

      // Open new window with print content
      const printWindow = window.open("", "_blank", "width=1200,height=800");
      printWindow.document.write(printContent);
      printWindow.document.close();
    },

    // View member
    viewMember: function (memberId) {
      TempleRouter.navigate("members/edit", { id: memberId });
    },

    // Format date
    formatDate: function (dateString) {
      if (!dateString) return "-";
      const date = new Date(dateString);
      return date.toLocaleDateString("en-GB", {
        day: "2-digit",
        month: "short",
        year: "numeric",
      });
    },

    // Format date time
    formatDateTime: function (dateString) {
      if (!dateString) return "-";
      const date = new Date(dateString);
      return date.toLocaleString("en-GB", {
        day: "2-digit",
        month: "short",
        year: "numeric",
        hour: "2-digit",
        minute: "2-digit",
      });
    },
  };
})(jQuery, window);
