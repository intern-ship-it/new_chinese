// // js/pages/auspicious-light/devotees.js
// // Pagoda Devotees Management - View and manage devotees

// (function ($, window) {
//     'use strict';

//     window.PagodaDevoteesPage = {
//         currentFilters: {},
//         currentPage: 1,
//         perPage: 25,

//         // Initialize page
//         init: function (params) {
//             console.log('Initializing Pagoda Devotees Management');
//             this.params = params || {};
//             this.render();
//             this.loadDevotees();
//             this.attachEvents();
//         },

//         // Render page structure
//         render: function () {
//             const html = `
//                 <div class="devotees-container">

//                     <!-- Page Header -->
//                     <div class="page-header mb-4" data-aos="fade-down">
//                         <div class="d-flex justify-content-between align-items-center flex-wrap">
//                             <div>
//                                 <h1 class="page-title mb-2">
//                                     <i class="bi bi-people me-2"></i>
//                                     Devotees Management
//                                 </h1>
//                                 <p class="text-muted mb-0">信徒管理 - Manage devotee information and history</p>
//                             </div>
//                             <div class="d-flex gap-2 mt-3 mt-md-0">
//                                 <button class="btn btn-outline-secondary" id="btnResetFilters">
//                                     <i class="bi bi-arrow-counterclockwise"></i> Reset
//                                 </button>
//                                 <button class="btn btn-outline-primary" id="btnExportDevotees">
//                                     <i class="bi bi-download"></i> Export
//                                 </button>
//                                 <button class="btn btn-success" id="btnAddDevotee">
//                                     <i class="bi bi-person-plus"></i> Add Devotee
//                                 </button>
//                             </div>
//                         </div>
//                     </div>

//                     <!-- Statistics Cards -->
//                     <div class="row g-3 mb-4" data-aos="fade-up">
//                         <div class="col-6 col-md-3">
//                             <div class="card stat-card border-start border-primary border-4">
//                                 <div class="card-body">
//                                     <div class="d-flex justify-content-between align-items-center">
//                                         <div>
//                                             <p class="text-muted mb-1 small">Total Devotees</p>
//                                             <h3 class="mb-0" id="statTotal">-</h3>
//                                         </div>
//                                         <i class="bi bi-people text-primary fs-2"></i>
//                                     </div>
//                                 </div>
//                             </div>
//                         </div>
//                         <div class="col-6 col-md-3">
//                             <div class="card stat-card border-start border-success border-4">
//                                 <div class="card-body">
//                                     <div class="d-flex justify-content-between align-items-center">
//                                         <div>
//                                             <p class="text-muted mb-1 small">Active</p>
//                                             <h3 class="mb-0" id="statActive">-</h3>
//                                         </div>
//                                         <i class="bi bi-check-circle text-success fs-2"></i>
//                                     </div>
//                                 </div>
//                             </div>
//                         </div>
//                         <div class="col-6 col-md-3">
//                             <div class="card stat-card border-start border-info border-4">
//                                 <div class="card-body">
//                                     <div class="d-flex justify-content-between align-items-center">
//                                         <div>
//                                             <p class="text-muted mb-1 small">New (This Month)</p>
//                                             <h3 class="mb-0" id="statNewThisMonth">-</h3>
//                                         </div>
//                                         <i class="bi bi-person-plus text-info fs-2"></i>
//                                     </div>
//                                 </div>
//                             </div>
//                         </div>
//                         <div class="col-6 col-md-3">
//                             <div class="card stat-card border-start border-warning border-4">
//                                 <div class="card-body">
//                                     <div class="d-flex justify-content-between align-items-center">
//                                         <div>
//                                             <p class="text-muted mb-1 small">With Active Lights</p>
//                                             <h3 class="mb-0" id="statWithLights">-</h3>
//                                         </div>
//                                         <i class="bi bi-lightbulb text-warning fs-2"></i>
//                                     </div>
//                                 </div>
//                             </div>
//                         </div>
//                     </div>

//                     <!-- Search & Filter -->
//                     <div class="card mb-4" data-aos="fade-up">
//                         <div class="card-header">
//                             <h5 class="mb-0">
//                                 <i class="bi bi-funnel me-2"></i>
//                                 Search & Filter
//                             </h5>
//                         </div>
//                         <div class="card-body">
//                             <div class="row g-3">
//                                 <!-- Quick Search -->
//                                 <div class="col-md-6">
//                                     <label class="form-label">Quick Search</label>
//                                     <div class="input-group">
//                                         <span class="input-group-text">
//                                             <i class="bi bi-search"></i>
//                                         </span>
//                                         <input type="text" class="form-control" id="searchInput" 
//                                                placeholder="Name, NRIC, Contact Number...">
//                                     </div>
//                                 </div>

//                                 <!-- Sort By -->
//                                 <div class="col-md-3">
//                                     <label class="form-label">Sort By</label>
//                                     <select class="form-select" id="sortBy">
//                                         <option value="created_at">Recent First</option>
//                                         <option value="name_english">Name (A-Z)</option>
//                                         <option value="registrations_count">Most Registrations</option>
//                                     </select>
//                                 </div>

//                                 <!-- Filter -->
//                                 <div class="col-md-3">
//                                     <label class="form-label">Filter</label>
//                                     <select class="form-select" id="filterType">
//                                         <option value="">All Devotees</option>
//                                         <option value="with_active">With Active Lights</option>
//                                         <option value="new_this_month">New This Month</option>
//                                         <option value="no_registrations">No Registrations</option>
//                                     </select>
//                                 </div>
//                             </div>

//                             <div class="row mt-3">
//                                 <div class="col-12">
//                                     <button class="btn btn-primary" id="btnApplyFilters">
//                                         <i class="bi bi-search"></i> Search
//                                     </button>
//                                     <button class="btn btn-outline-secondary ms-2" id="btnClearFilters">
//                                         <i class="bi bi-x-circle"></i> Clear
//                                     </button>
//                                 </div>
//                             </div>
//                         </div>
//                     </div>

//                     <!-- Devotees List -->
//                     <div class="card" data-aos="fade-up">
//                         <div class="card-header d-flex justify-content-between align-items-center">
//                             <h5 class="mb-0">
//                                 <i class="bi bi-list-ul me-2"></i>
//                                 Devotees List
//                             </h5>
//                             <div class="d-flex align-items-center gap-3">
//                                 <span class="text-muted" id="resultsCount">Loading...</span>
//                                 <select class="form-select form-select-sm" id="perPageSelect" style="width: auto;">
//                                     <option value="10">10 per page</option>
//                                     <option value="25" selected>25 per page</option>
//                                     <option value="50">50 per page</option>
//                                     <option value="100">100 per page</option>
//                                 </select>
//                             </div>
//                         </div>
//                         <div class="card-body p-0">
//                             <div class="table-responsive">
//                                 <table class="table table-hover mb-0" id="devoteesTable">
//                                     <thead class="table-light">
//                                         <tr>
//                                             <th>Name</th>
//                                             <th>NRIC</th>
//                                             <th>Contact</th>
//                                             <th>Email</th>
//                                             <th>Registrations</th>
//                                             <th>Active Lights</th>
//                                             <th>Last Registration</th>
//                                             <th>Actions</th>
//                                         </tr>
//                                     </thead>
//                                     <tbody id="devoteesTableBody">
//                                         <tr>
//                                             <td colspan="8" class="text-center py-5">
//                                                 <div class="spinner-border text-primary" role="status">
//                                                     <span class="visually-hidden">Loading...</span>
//                                                 </div>
//                                                 <p class="mt-3 text-muted">Loading devotees...</p>
//                                             </td>
//                                         </tr>
//                                     </tbody>
//                                 </table>
//                             </div>
//                         </div>
//                         <div class="card-footer">
//                             <div id="paginationContainer"></div>
//                         </div>
//                     </div>

//                 </div>
//             `;

//             $('#page-container').html(html);

//             // Initialize AOS
//             if (typeof AOS !== 'undefined') {
//                 AOS.refresh();
//             }
//         },

//         // Load devotees
//         loadDevotees: function () {
//             const self = this;

//             const params = {
//                 page: this.currentPage,
//                 per_page: this.perPage,
//                 ...this.currentFilters
//             };

//             TempleUtils.showLoading('Loading devotees...');

//             PagodaAPI.devotees.getAll(params)
//                 .done(function (response) {
//                     if (response.success && response.data) {
//                         self.renderDevoteesTable(response.data);
//                         self.renderPagination(response.data);
//                         self.updateStatistics(response.data.statistics);
//                     } else {
//                         self.showNoResults();
//                     }
//                 })
//                 .fail(function (xhr) {
//                     TempleUtils.handleAjaxError(xhr, 'Failed to load devotees');
//                     self.showNoResults();
//                 })
//                 .always(function () {
//                     TempleUtils.hideLoading();
//                 });
//         },

//         // Update statistics
//         updateStatistics: function (stats) {
//             if (!stats) return;

//             $('#statTotal').text(stats.total || 0);
//             $('#statActive').text(stats.with_active_registrations || 0);
//             $('#statNewThisMonth').text(stats.new_this_month || 0);
//             $('#statWithLights').text(stats.with_active_registrations || 0);
//         },

//         // Render devotees table
//         renderDevoteesTable: function (data) {
//             const devotees = data.data || [];
//             const total = data.total || 0;

//             $('#resultsCount').text(`Showing ${devotees.length} of ${total} devotees`);

//             if (devotees.length === 0) {
//                 this.showNoResults();
//                 return;
//             }

//             const rows = devotees.map(devotee => {
//                 const lastReg = devotee.last_registration_date ?
//                     moment(devotee.last_registration_date).format('DD/MM/YYYY') :
//                     '-';

//                 const activeLightsCount = devotee.active_registrations_count || 0;
//                 const activeLightsBadge = activeLightsCount > 0 ?
//                     `<span class="badge bg-success">${activeLightsCount}</span>` :
//                     '<span class="text-muted">-</span>';

//                 return `
//                     <tr data-id="${devotee.id}">
//                         <td>
//                             <div>
//                                 <strong>${devotee.name_english}</strong>
//                                 ${devotee.name_chinese ? `<br><small class="text-muted">${devotee.name_chinese}</small>` : ''}
//                             </div>
//                         </td>
//                         <td>
//                             <small>${devotee.nric}</small>
//                         </td>
//                         <td>
//                             <small>
//                                 <i class="bi bi-telephone me-1"></i>${devotee.contact_no}
//                             </small>
//                         </td>
//                         <td>
//                             <small>${devotee.email || '-'}</small>
//                         </td>
//                         <td class="text-center">
//                             <span class="badge bg-primary">${devotee.total_registrations_count || 0}</span>
//                         </td>
//                         <td class="text-center">
//                             ${activeLightsBadge}
//                         </td>
//                         <td class="text-center">
//                             <small>${lastReg}</small>
//                         </td>
//                         <td>
//                             <div class="btn-group btn-group-sm">
//                                 <button class="btn btn-outline-primary btn-view-devotee" 
//                                         data-id="${devotee.id}" title="View Details">
//                                     <i class="bi bi-eye"></i>
//                                 </button>
//                                 <button class="btn btn-outline-secondary btn-edit-devotee" 
//                                         data-id="${devotee.id}" title="Edit">
//                                     <i class="bi bi-pencil"></i>
//                                 </button>
//                                 <button class="btn btn-outline-success btn-new-registration" 
//                                         data-id="${devotee.id}" title="New Registration">
//                                     <i class="bi bi-plus-circle"></i>
//                                 </button>
//                             </div>
//                         </td>
//                     </tr>
//                 `;
//             }).join('');

//             $('#devoteesTableBody').html(rows);
//         },

//         // Show no results
//         showNoResults: function () {
//             $('#devoteesTableBody').html(`
//                 <tr>
//                     <td colspan="8" class="text-center py-5">
//                         <i class="bi bi-inbox display-4 text-muted d-block mb-3"></i>
//                         <p class="text-muted">No devotees found</p>
//                         <button class="btn btn-sm btn-outline-primary" id="btnClearFiltersNoResults">
//                             <i class="bi bi-arrow-counterclockwise"></i> Clear Filters
//                         </button>
//                     </td>
//                 </tr>
//             `);

//             $('#resultsCount').text('No results');
//             $('#paginationContainer').empty();
//         },

//         // Render pagination
//         renderPagination: function (data) {
//             const totalPages = data.last_page || 1;
//             const currentPage = data.current_page || 1;

//             if (totalPages <= 1) {
//                 $('#paginationContainer').empty();
//                 return;
//             }

//             let paginationHtml = '<nav><ul class="pagination pagination-sm mb-0 justify-content-center">';

//             // Previous
//             paginationHtml += `
//                 <li class="page-item ${currentPage === 1 ? 'disabled' : ''}">
//                     <a class="page-link" href="#" data-page="${currentPage - 1}">
//                         <i class="bi bi-chevron-left"></i>
//                     </a>
//                 </li>
//             `;

//             // Pages
//             let startPage = Math.max(1, currentPage - 2);
//             let endPage = Math.min(totalPages, currentPage + 2);

//             if (startPage > 1) {
//                 paginationHtml += `<li class="page-item"><a class="page-link" href="#" data-page="1">1</a></li>`;
//                 if (startPage > 2) {
//                     paginationHtml += `<li class="page-item disabled"><span class="page-link">...</span></li>`;
//                 }
//             }

//             for (let i = startPage; i <= endPage; i++) {
//                 paginationHtml += `
//                     <li class="page-item ${i === currentPage ? 'active' : ''}">
//                         <a class="page-link" href="#" data-page="${i}">${i}</a>
//                     </li>
//                 `;
//             }

//             if (endPage < totalPages) {
//                 if (endPage < totalPages - 1) {
//                     paginationHtml += `<li class="page-item disabled"><span class="page-link">...</span></li>`;
//                 }
//                 paginationHtml += `<li class="page-item"><a class="page-link" href="#" data-page="${totalPages}">${totalPages}</a></li>`;
//             }

//             // Next
//             paginationHtml += `
//                 <li class="page-item ${currentPage === totalPages ? 'disabled' : ''}">
//                     <a class="page-link" href="#" data-page="${currentPage + 1}">
//                         <i class="bi bi-chevron-right"></i>
//                     </a>
//                 </li>
//             `;

//             paginationHtml += '</ul></nav>';

//             $('#paginationContainer').html(paginationHtml);
//         },

//         // Attach event handlers
//         attachEvents: function () {
//             const self = this;

//             // Apply filters
//             $('#btnApplyFilters').on('click', function () {
//                 self.applyFilters();
//             });

//             // Clear filters
//             $('#btnClearFilters, #btnClearFiltersNoResults').on('click', function () {
//                 self.clearFilters();
//             });

//             // Reset filters
//             $('#btnResetFilters').on('click', function () {
//                 self.clearFilters();
//             });

//             // Search on Enter
//             $('#searchInput').on('keypress', function (e) {
//                 if (e.which === 13) {
//                     self.applyFilters();
//                 }
//             });

//             // Per page change
//             $('#perPageSelect').on('change', function () {
//                 self.perPage = parseInt($(this).val());
//                 self.currentPage = 1;
//                 self.loadDevotees();
//             });

//             // Pagination
//             $(document).on('click', '#paginationContainer .page-link', function (e) {
//                 e.preventDefault();
//                 const page = parseInt($(this).data('page'));
//                 if (page && !$(this).parent().hasClass('disabled')) {
//                     self.currentPage = page;
//                     self.loadDevotees();
//                     $('html, body').animate({ scrollTop: 0 }, 300);
//                 }
//             });

//             // View devotee
//             $(document).on('click', '.btn-view-devotee', function () {
//                 const id = $(this).data('id');
//                 self.viewDevotee(id);
//             });

//             // Edit devotee
//             $(document).on('click', '.btn-edit-devotee', function () {
//                 const id = $(this).data('id');
//                 self.editDevotee(id);
//             });

//             // New registration for devotee
//             $(document).on('click', '.btn-new-registration', function () {
//                 const id = $(this).data('id');
//                 self.newRegistrationForDevotee(id);
//             });

//             // Add devotee
//             $('#btnAddDevotee').on('click', function () {
//                 self.showAddDevoteeModal();
//             });

//             // Export
//             $('#btnExportDevotees').on('click', function () {
//                 self.exportDevotees();
//             });
//         },

//         // Apply filters
//         applyFilters: function () {
//             this.currentFilters = {
//                 search: $('#searchInput').val().trim(),
//                 sort_by: $('#sortBy').val(),
//                 filter: $('#filterType').val()
//             };

//             // Remove empty filters
//             Object.keys(this.currentFilters).forEach(key => {
//                 if (!this.currentFilters[key]) {
//                     delete this.currentFilters[key];
//                 }
//             });

//             this.currentPage = 1;
//             this.loadDevotees();
//         },

//         // Clear filters
//         clearFilters: function () {
//             $('#searchInput').val('');
//             $('#sortBy').val('created_at');
//             $('#filterType').val('');

//             this.currentFilters = {};
//             this.currentPage = 1;
//             this.loadDevotees();
//         },

//         // View devotee details
//         viewDevotee: function (id) {
//             const self = this;

//             TempleUtils.showLoading('Loading devotee details...');

//             PagodaAPI.devotees.getById(id)
//                 .done(function (response) {
//                     if (response.success && response.data) {
//                         self.showDevoteeModal(response.data);
//                     }
//                 })
//                 .fail(function (xhr) {
//                     TempleUtils.handleAjaxError(xhr, 'Failed to load devotee details');
//                 })
//                 .always(function () {
//                     TempleUtils.hideLoading();
//                 });
//         },

//         // Show devotee modal
//         showDevoteeModal: function (data) {
//             const devotee = data.devotee;
//             const registrations = data.registrations || [];

//             const regsRows = registrations.map(reg => `
//                 <tr>
//                     <td><span class="badge bg-secondary">${reg.receipt_number}</span></td>
//                     <td><code class="light-code">${reg.light_code}</code></td>
//                     <td class="text-center"><small>${moment(reg.offer_date).format('DD/MM/YYYY')}</small></td>
//                     <td class="text-center"><small>${moment(reg.expiry_date).format('DD/MM/YYYY')}</small></td>
//                     <td class="text-end">${PagodaAPI.utils.formatCurrency(reg.merit_amount)}</td>
//                     <td>
//                         <span class="badge bg-${reg.status === 'active' ? 'success' : reg.status === 'expired' ? 'warning' : 'secondary'}">
//                             ${reg.status}
//                         </span>
//                     </td>
//                 </tr>
//             `).join('') || '<tr><td colspan="6" class="text-center text-muted py-3">No registrations yet</td></tr>';

//             const modalHtml = `
//                 <div class="modal fade" id="devoteeModal" tabindex="-1">
//                     <div class="modal-dialog modal-lg">
//                         <div class="modal-content">
//                             <div class="modal-header bg-primary text-white">
//                                 <h5 class="modal-title">
//                                     <i class="bi bi-person me-2"></i>
//                                     Devotee Details
//                                 </h5>
//                                 <button type="button" class="btn-close btn-close-white" data-bs-dismiss="modal"></button>
//                             </div>
//                             <div class="modal-body">
//                                 <div class="row g-4">
//                                     <!-- Personal Information -->
//                                     <div class="col-md-6">
//                                         <h6 class="border-bottom pb-2 mb-3">
//                                             <i class="bi bi-person-badge me-2"></i>Personal Information
//                                         </h6>
//                                         <table class="table table-sm table-borderless">
//                                             <tr>
//                                                 <td class="text-muted" width="40%">Name (English):</td>
//                                                 <td><strong>${devotee.name_english}</strong></td>
//                                             </tr>
//                                             ${devotee.name_chinese ? `
//                                             <tr>
//                                                 <td class="text-muted">Name (Chinese):</td>
//                                                 <td><strong>${devotee.name_chinese}</strong></td>
//                                             </tr>
//                                             ` : ''}
//                                             <tr>
//                                                 <td class="text-muted">NRIC:</td>
//                                                 <td>${devotee.nric}</td>
//                                             </tr>
//                                         </table>
//                                     </div>

//                                     <!-- Contact Information -->
//                                     <div class="col-md-6">
//                                         <h6 class="border-bottom pb-2 mb-3">
//                                             <i class="bi bi-telephone me-2"></i>Contact Information
//                                         </h6>
//                                         <table class="table table-sm table-borderless">
//                                             <tr>
//                                                 <td class="text-muted" width="40%">Contact Number:</td>
//                                                 <td>${devotee.contact_no}</td>
//                                             </tr>
//                                             <tr>
//                                                 <td class="text-muted">Email:</td>
//                                                 <td>${devotee.email || '-'}</td>
//                                             </tr>
//                                             <tr>
//                                                 <td class="text-muted">Registered On:</td>
//                                                 <td>${moment(devotee.created_at).format('DD/MM/YYYY')}</td>
//                                             </tr>
//                                         </table>
//                                     </div>

//                                     <!-- Statistics -->
//                                     <div class="col-12">
//                                         <h6 class="border-bottom pb-2 mb-3">
//                                             <i class="bi bi-graph-up me-2"></i>Registration Statistics
//                                         </h6>
//                                         <div class="row text-center g-3">
//                                             <div class="col-4">
//                                                 <div class="card bg-light">
//                                                     <div class="card-body">
//                                                         <h4 class="text-primary mb-1">${devotee.total_registrations || 0}</h4>
//                                                         <small class="text-muted">Total Registrations</small>
//                                                     </div>
//                                                 </div>
//                                             </div>
//                                             <div class="col-4">
//                                                 <div class="card bg-light">
//                                                     <div class="card-body">
//                                                         <h4 class="text-success mb-1">${devotee.active_registrations || 0}</h4>
//                                                         <small class="text-muted">Active Lights</small>
//                                                     </div>
//                                                 </div>
//                                             </div>
//                                             <div class="col-4">
//                                                 <div class="card bg-light">
//                                                     <div class="card-body">
//                                                         <h4 class="text-info mb-1">${PagodaAPI.utils.formatCurrency(devotee.total_merit || 0)}</h4>
//                                                         <small class="text-muted">Total Merit</small>
//                                                     </div>
//                                                 </div>
//                                             </div>
//                                         </div>
//                                     </div>

//                                     <!-- Registration History -->
//                                     <div class="col-12">
//                                         <h6 class="border-bottom pb-2 mb-3">
//                                             <i class="bi bi-clock-history me-2"></i>Registration History
//                                         </h6>
//                                         <div class="table-responsive">
//                                             <table class="table table-sm table-hover">
//                                                 <thead class="table-light">
//                                                     <tr>
//                                                         <th>Receipt #</th>
//                                                         <th>Light Code</th>
//                                                         <th>Offer Date</th>
//                                                         <th>Expiry Date</th>
//                                                         <th>Amount</th>
//                                                         <th>Status</th>
//                                                     </tr>
//                                                 </thead>
//                                                 <tbody>
//                                                     ${regsRows}
//                                                 </tbody>
//                                             </table>
//                                         </div>
//                                     </div>
//                                 </div>
//                             </div>
//                             <div class="modal-footer">
//                                 <button type="button" class="btn btn-secondary" data-bs-dismiss="modal">Close</button>
//                                 <button type="button" class="btn btn-outline-primary" onclick="PagodaDevoteesPage.editDevotee(${devotee.id})">
//                                     <i class="bi bi-pencil"></i> Edit
//                                 </button>
//                                 <button type="button" class="btn btn-success" onclick="PagodaDevoteesPage.newRegistrationForDevotee(${devotee.id})">
//                                     <i class="bi bi-plus-circle"></i> New Registration
//                                 </button>
//                             </div>
//                         </div>
//                     </div>
//                 </div>
//             `;

//             $('#devoteeModal').remove();
//             $('body').append(modalHtml);
//             const modal = new bootstrap.Modal(document.getElementById('devoteeModal'));
//             modal.show();

//             $('#devoteeModal').on('hidden.bs.modal', function () {
//                 $(this).remove();
//             });
//         },

//         // Show add devotee modal
//         showAddDevoteeModal: function () {
//             const self = this;

//             const modalHtml = `
//                 <div class="modal fade" id="addDevoteeModal" tabindex="-1">
//                     <div class="modal-dialog">
//                         <div class="modal-content">
//                             <div class="modal-header bg-success text-white">
//                                 <h5 class="modal-title">
//                                     <i class="bi bi-person-plus me-2"></i>
//                                     Add New Devotee
//                                 </h5>
//                                 <button type="button" class="btn-close btn-close-white" data-bs-dismiss="modal"></button>
//                             </div>
//                             <form id="addDevoteeForm">
//                                 <div class="modal-body">
//                                     <div class="row g-3">
//                                         <div class="col-12">
//                                             <label class="form-label">Name (English) *</label>
//                                             <input type="text" class="form-control" name="name_english" required>
//                                         </div>
//                                         <div class="col-12">
//                                             <label class="form-label">Name (Chinese)</label>
//                                             <input type="text" class="form-control" name="name_chinese">
//                                         </div>
//                                         <div class="col-12">
//                                             <label class="form-label">NRIC *</label>
//                                             <input type="text" class="form-control" name="nric" required>
//                                         </div>
//                                         <div class="col-12">
//                                             <label class="form-label">Contact Number *</label>
//                                             <input type="tel" class="form-control" name="contact_no" required>
//                                         </div>
//                                         <div class="col-12">
//                                             <label class="form-label">Email</label>
//                                             <input type="email" class="form-control" name="email">
//                                         </div>
//                                     </div>
//                                 </div>
//                                 <div class="modal-footer">
//                                     <button type="button" class="btn btn-secondary" data-bs-dismiss="modal">Cancel</button>
//                                     <button type="submit" class="btn btn-success">
//                                         <i class="bi bi-check-circle"></i> Add Devotee
//                                     </button>
//                                 </div>
//                             </form>
//                         </div>
//                     </div>
//                 </div>
//             `;

//             $('#addDevoteeModal').remove();
//             $('body').append(modalHtml);
//             const modal = new bootstrap.Modal(document.getElementById('addDevoteeModal'));
//             modal.show();

//             // Form submit
//             $('#addDevoteeForm').on('submit', function (e) {
//                 e.preventDefault();

//                 const formData = {
//                     name_english: $('input[name="name_english"]').val(),
//                     name_chinese: $('input[name="name_chinese"]').val(),
//                     nric: $('input[name="nric"]').val(),
//                     contact_no: $('input[name="contact_no"]').val(),
//                     email: $('input[name="email"]').val()
//                 };

//                 TempleUtils.showLoading('Adding devotee...');

//                 PagodaAPI.devotees.create(formData)
//                     .done(function (response) {
//                         if (response.success) {
//                             TempleUtils.showSuccess('Devotee added successfully');
//                             modal.hide();
//                             self.loadDevotees();
//                         }
//                     })
//                     .fail(function (xhr) {
//                         TempleUtils.handleAjaxError(xhr, 'Failed to add devotee');
//                     })
//                     .always(function () {
//                         TempleUtils.hideLoading();
//                     });
//             });

//             $('#addDevoteeModal').on('hidden.bs.modal', function () {
//                 $(this).remove();
//             });
//         },

//         // Edit devotee
//         editDevotee: function (id) {
//             const self = this;

//             // Close any open modals first
//             $('.modal').modal('hide');

//             TempleUtils.showLoading('Loading devotee...');

//             PagodaAPI.devotees.getById(id)
//                 .done(function (response) {
//                     if (response.success && response.data) {
//                         self.showEditDevoteeModal(response.data.devotee);
//                     }
//                 })
//                 .fail(function (xhr) {
//                     TempleUtils.handleAjaxError(xhr, 'Failed to load devotee');
//                 })
//                 .always(function () {
//                     TempleUtils.hideLoading();
//                 });
//         },

//         // Show edit devotee modal
//         showEditDevoteeModal: function (devotee) {
//             const self = this;

//             const modalHtml = `
//                 <div class="modal fade" id="editDevoteeModal" tabindex="-1">
//                     <div class="modal-dialog">
//                         <div class="modal-content">
//                             <div class="modal-header bg-primary text-white">
//                                 <h5 class="modal-title">
//                                     <i class="bi bi-pencil me-2"></i>
//                                     Edit Devotee
//                                 </h5>
//                                 <button type="button" class="btn-close btn-close-white" data-bs-dismiss="modal"></button>
//                             </div>
//                             <form id="editDevoteeForm">
//                                 <div class="modal-body">
//                                     <div class="row g-3">
//                                         <div class="col-12">
//                                             <label class="form-label">Name (English) *</label>
//                                             <input type="text" class="form-control" name="name_english" value="${devotee.name_english}" required>
//                                         </div>
//                                         <div class="col-12">
//                                             <label class="form-label">Name (Chinese)</label>
//                                             <input type="text" class="form-control" name="name_chinese" value="${devotee.name_chinese || ''}">
//                                         </div>
//                                         <div class="col-12">
//                                             <label class="form-label">NRIC *</label>
//                                             <input type="text" class="form-control" name="nric" value="${devotee.nric}" required>
//                                         </div>
//                                         <div class="col-12">
//                                             <label class="form-label">Contact Number *</label>
//                                             <input type="tel" class="form-control" name="contact_no" value="${devotee.contact_no}" required>
//                                         </div>
//                                         <div class="col-12">
//                                             <label class="form-label">Email</label>
//                                             <input type="email" class="form-control" name="email" value="${devotee.email || ''}">
//                                         </div>
//                                     </div>
//                                 </div>
//                                 <div class="modal-footer">
//                                     <button type="button" class="btn btn-secondary" data-bs-dismiss="modal">Cancel</button>
//                                     <button type="submit" class="btn btn-primary">
//                                         <i class="bi bi-check-circle"></i> Update Devotee
//                                     </button>
//                                 </div>
//                             </form>
//                         </div>
//                     </div>
//                 </div>
//             `;

//             $('#editDevoteeModal').remove();
//             $('body').append(modalHtml);
//             const modal = new bootstrap.Modal(document.getElementById('editDevoteeModal'));
//             modal.show();

//             // Form submit
//             $('#editDevoteeForm').on('submit', function (e) {
//                 e.preventDefault();

//                 const formData = {
//                     name_english: $('input[name="name_english"]').val(),
//                     name_chinese: $('input[name="name_chinese"]').val(),
//                     nric: $('input[name="nric"]').val(),
//                     contact_no: $('input[name="contact_no"]').val(),
//                     email: $('input[name="email"]').val()
//                 };

//                 TempleUtils.showLoading('Updating devotee...');

//                 PagodaAPI.devotees.update(devotee.id, formData)
//                     .done(function (response) {
//                         if (response.success) {
//                             TempleUtils.showSuccess('Devotee updated successfully');
//                             modal.hide();
//                             self.loadDevotees();
//                         }
//                     })
//                     .fail(function (xhr) {
//                         TempleUtils.handleAjaxError(xhr, 'Failed to update devotee');
//                     })
//                     .always(function () {
//                         TempleUtils.hideLoading();
//                     });
//             });

//             $('#editDevoteeModal').on('hidden.bs.modal', function () {
//                 $(this).remove();
//             });
//         },

//         // New registration for devotee
//         newRegistrationForDevotee: function (devoteeId) {
//             // Store devotee ID and redirect to entry form
//             sessionStorage.setItem('selected_devotee_id', devoteeId);
//             $('.modal').modal('hide');
//             setTimeout(function () {
//                 TempleRouter.navigate('auspicious-light/entry');
//             }, 300);
//         },

//         // Export devotees
//         exportDevotees: function () {
//             TempleUtils.showInfo('Export functionality coming soon');
//             // TODO: Implement export
//         },

//         // Cleanup
//         destroy: function () {
//             // Cleanup
//         }
//     };

// })(jQuery, window);






// js/pages/auspicious-light/devotees.js
// Pagoda Devotees Management - View and manage devotees

(function ($, window) {
    'use strict';

    window.PagodaDevoteesPage = {
        currentFilters: {},
        currentPage: 1,
        perPage: 25,

        // Initialize page
        init: function (params) {
            console.log('Initializing Pagoda Devotees Management');
            this.params = params || {};
            this.render();
            this.loadDevotees();
            this.attachEvents();
            this.loadStatistics();
        },
        // Add a dedicated function to load statistics
        loadStatistics: function () {
            const self = this;

            console.log('Loading devotee statistics...');

            // Call the devotees analytics/statistics endpoint
            PagodaAPI.reports.getDevoteeAnalytics()
                .done(function (response) {
                    console.log('Statistics response:', response);

                    if (response.success && response.data) {
                        self.updateStatistics(response.data);
                    } else {
                        console.warn('No statistics data returned');
                        self.setDefaultStatistics();
                    }
                })
                .fail(function (xhr) {
                    console.error('Failed to load devotee statistics:', xhr);
                    self.setDefaultStatistics();
                });
        },

        // Update the updateStatistics function to handle different data structures
        updateStatistics: function (data) {
            console.log('Updating statistics with data:', data);

            // Handle different possible data structures from API
            const stats = data.statistics || data;

            // Total Devotees
            const totalDevotees = stats.total_devotees || stats.total || 0;
            $('#statTotal').text(this.formatNumber(totalDevotees));

            // Active Devotees (with active registrations)
            const activeDevotees = stats.with_active_registrations ||
                stats.with_active_lights ||
                stats.active || 0;
            $('#statActive').text(this.formatNumber(activeDevotees));

            // New This Month
            const newThisMonth = stats.new_this_month || 0;
            $('#statNewThisMonth').text(this.formatNumber(newThisMonth));

            // With Active Lights (same as active)
            const withLights = stats.with_active_lights ||
                stats.with_active_registrations ||
                activeDevotees;
            $('#statWithLights').text(this.formatNumber(withLights));

            console.log('Statistics updated successfully:', {
                total: totalDevotees,
                active: activeDevotees,
                newMonth: newThisMonth,
                withLights: withLights
            });
        },

        // Add a function to set default statistics on error
        setDefaultStatistics: function () {
            $('#statTotal').text('0');
            $('#statActive').text('0');
            $('#statNewThisMonth').text('0');
            $('#statWithLights').text('0');
        },

        // Add a number formatting helper
        formatNumber: function (num) {
            if (num === null || num === undefined) return '0';
            return num.toString().replace(/\B(?=(\d{3})+(?!\d))/g, ',');
        },


        // Render page structure
        render: function () {
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
                                            <th>Registrations</th>
                                            <th>Active Lights</th>
                                            <th>Last Registration</th>
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

            $('#page-container').html(html);
        },

        // Update the loadDevotees function to optionally update stats
        loadDevotees: function () {
            const self = this;

            const params = {
                page: this.currentPage,
                per_page: this.perPage,
                ...this.currentFilters
            };

            TempleUtils.showLoading('Loading devotees...');

            PagodaAPI.devotees.getAll(params)
                .done(function (response) {
                    if (response.success && response.data) {
                        self.renderDevoteesTable(response.data);
                        self.renderPagination(response.data);

                        // Update statistics if included in response
                        if (response.data.statistics) {
                            self.updateStatistics(response.data.statistics);
                        }
                    } else {
                        self.showNoResults();
                    }
                })
                .fail(function (xhr) {
                    TempleUtils.handleAjaxError(xhr, 'Failed to load devotees');
                    self.showNoResults();
                })
                .always(function () {
                    TempleUtils.hideLoading();
                });
        },

        // Update the updateStatistics function to handle the correct field names
        updateStatistics: function (data) {
            console.log('Updating statistics with data:', data);

            // Handle different possible data structures from API
            const stats = data.statistics || data;

            // Total Devotees
            const totalDevotees = stats.total_devotees || stats.total || 0;
            $('#statTotal').text(this.formatNumber(totalDevotees));

            // Active Devotees (with active registrations)
            const activeDevotees = stats.active_devotees ||
                stats.with_active_registrations ||
                stats.with_active_lights ||
                stats.active || 0;
            $('#statActive').text(this.formatNumber(activeDevotees));

            // New This Month - the API returns 'new_devotees' not 'new_this_month'
            const newThisMonth = stats.new_devotees || stats.new_this_month || 0;
            $('#statNewThisMonth').text(this.formatNumber(newThisMonth));

            // With Active Lights (same as active devotees)
            const withLights = stats.active_devotees ||
                stats.with_active_lights ||
                stats.with_active_registrations ||
                activeDevotees;
            $('#statWithLights').text(this.formatNumber(withLights));

            console.log('Statistics updated successfully:', {
                total: totalDevotees,
                active: activeDevotees,
                newMonth: newThisMonth,
                withLights: withLights
            });
        },

        // Render devotees table
        renderDevoteesTable: function (data) {
            const devotees = data.data || [];
            const total = data.total || 0;

            $('#resultsCount').text(`Showing ${devotees.length} of ${total} devotees`);

            if (devotees.length === 0) {
                this.showNoResults();
                return;
            }

            const rows = devotees.map(devotee => {
                // Fix: Use 'total_registrations' instead of 'total_registrations_count'
                const totalRegs = devotee.total_registrations || 0;

                // Fix: Use 'active_registrations' instead of 'active_registrations_count'
                const activeRegs = devotee.active_registrations || 0;

                // Fix: Handle missing last_registration_date field
                // Since the API doesn't return this field, we'll show '-' or you can remove this column
                const lastReg = devotee.last_registration_date
                    ? moment(devotee.last_registration_date).format('DD/MM/YYYY')
                    : '-';

                const activeLightsBadge = activeRegs > 0
                    ? `<span class="badge bg-success">${activeRegs}</span>`
                    : '<span class="text-muted">-</span>';

                return `
            <tr data-id="${devotee.id}">
                <td>
                    <div>
                        <strong>${devotee.name_english}</strong>
                        ${devotee.name_chinese ? `<br><small class="text-muted">${devotee.name_chinese}</small>` : ''}
                    </div>
                </td>
                <td>
                    <small>${devotee.nric}</small>
                </td>
                <td>
                    <small>
                        <i class="bi bi-telephone me-1"></i>${devotee.contact_no}
                    </small>
                </td>
                <td>
                    <small>${devotee.email || '-'}</small>
                </td>
                <td class="text-center">
                    <span class="badge bg-primary">${totalRegs}</span>
                </td>
                <td class="text-center">
                    ${activeLightsBadge}
                </td>
                <td class="text-center">
                    <small>${lastReg}</small>
                </td>
                <td>
                    <div class="btn-group btn-group-sm">
                        <button class="btn btn-outline-primary btn-view-devotee" 
                                data-id="${devotee.id}" title="View Details">
                            <i class="bi bi-eye"></i>
                        </button>
                        <button class="btn btn-outline-secondary btn-edit-devotee" 
                                data-id="${devotee.id}" title="Edit">
                            <i class="bi bi-pencil"></i>
                        </button>
                        <button class="btn btn-outline-success btn-new-registration" 
                                data-id="${devotee.id}" title="New Registration">
                            <i class="bi bi-plus-circle"></i>
                        </button>
                    </div>
                </td>
            </tr>
        `;
            }).join('');

            $('#devoteesTableBody').html(rows);
        },

        // Show no results
        showNoResults: function () {
            $('#devoteesTableBody').html(`
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

            $('#resultsCount').text('No results');
            $('#paginationContainer').empty();
        },

        // Render pagination
        renderPagination: function (data) {
            const totalPages = data.last_page || 1;
            const currentPage = data.current_page || 1;

            if (totalPages <= 1) {
                $('#paginationContainer').empty();
                return;
            }

            let paginationHtml = '<nav><ul class="pagination pagination-sm mb-0 justify-content-center">';

            // Previous
            paginationHtml += `
                <li class="page-item ${currentPage === 1 ? 'disabled' : ''}">
                    <a class="page-link" href="#" data-page="${currentPage - 1}">
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
                    <li class="page-item ${i === currentPage ? 'active' : ''}">
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
                <li class="page-item ${currentPage === totalPages ? 'disabled' : ''}">
                    <a class="page-link" href="#" data-page="${currentPage + 1}">
                        <i class="bi bi-chevron-right"></i>
                    </a>
                </li>
            `;

            paginationHtml += '</ul></nav>';

            $('#paginationContainer').html(paginationHtml);
        },

        // Attach event handlers with namespaced events
        attachEvents: function () {
            const self = this;

            // ✅ IMPORTANT: Remove old event handlers first to prevent duplicates
            this.detachEvents();

            // Apply filters
            $(document).on('click.pagodaDevotees', '#btnApplyFilters', function () {
                self.applyFilters();
            });

            // Clear filters
            $(document).on('click.pagodaDevotees', '#btnClearFilters, #btnClearFiltersNoResults', function () {
                self.clearFilters();
            });

            // Reset filters
            $(document).on('click.pagodaDevotees', '#btnResetFilters', function () {
                self.clearFilters();
            });

            // Search on Enter
            $(document).on('keypress.pagodaDevotees', '#searchInput', function (e) {
                if (e.which === 13) {
                    self.applyFilters();
                }
            });

            // Per page change
            $(document).on('change.pagodaDevotees', '#perPageSelect', function () {
                self.perPage = parseInt($(this).val());
                self.currentPage = 1;
                self.loadDevotees();
            });

            // Pagination
            $(document).on('click.pagodaDevotees', '#paginationContainer .page-link', function (e) {
                e.preventDefault();
                const page = parseInt($(this).data('page'));
                if (page && !$(this).parent().hasClass('disabled')) {
                    self.currentPage = page;
                    self.loadDevotees();
                    $('html, body').animate({ scrollTop: 0 }, 300);
                }
            });

            // View devotee
            $(document).on('click.pagodaDevotees', '.btn-view-devotee', function () {
                const id = $(this).data('id');
                self.viewDevotee(id);
            });

            // Edit devotee
            $(document).on('click.pagodaDevotees', '.btn-edit-devotee', function () {
                const id = $(this).data('id');
                self.editDevotee(id);
            });

            // New registration for devotee
            $(document).on('click.pagodaDevotees', '.btn-new-registration', function () {
                const id = $(this).data('id');
                self.newRegistrationForDevotee(id);
            });

            // Add devotee
            $(document).on('click.pagodaDevotees', '#btnAddDevotee', function () {
                self.showAddDevoteeModal();
            });

            // Export
            $(document).on('click.pagodaDevotees', '#btnExportDevotees', function () {
                self.exportDevotees();
            });
        },

        // Detach all event handlers
        detachEvents: function () {
            // Remove all namespaced events
            $(document).off('.pagodaDevotees');

            console.log('Pagoda Devotees events detached');
        },

        // Apply filters
        applyFilters: function () {
            this.currentFilters = {
                search: $('#searchInput').val().trim(),
                sort_by: $('#sortBy').val(),
                filter: $('#filterType').val()
            };

            // Remove empty filters
            Object.keys(this.currentFilters).forEach(key => {
                if (!this.currentFilters[key]) {
                    delete this.currentFilters[key];
                }
            });

            this.currentPage = 1;
            this.loadDevotees();
        },

        // Clear filters
        clearFilters: function () {
            $('#searchInput').val('');
            $('#sortBy').val('created_at');
            $('#filterType').val('');

            this.currentFilters = {};
            this.currentPage = 1;
            this.loadDevotees();
        },

        // View devotee details
        viewDevotee: function (id) {
            const self = this;

            TempleUtils.showLoading('Loading devotee details...');

            PagodaAPI.devotees.getById(id)
                .done(function (response) {
                    if (response.success && response.data) {
                        self.showDevoteeModal(response.data);
                    }
                })
                .fail(function (xhr) {
                    TempleUtils.handleAjaxError(xhr, 'Failed to load devotee details');
                })
                .always(function () {
                    TempleUtils.hideLoading();
                });
        },

        // Show devotee modal - CORRECTED VERSION
        showDevoteeModal: function (data) {
            const devotee = data.devotee;
            const registrations = data.registrations || [];
            const statistics = data.statistics || {}; // ✅ FIX: Get statistics from separate object

            const regsRows = registrations.map(reg => `
        <tr>
            <td><span class="badge bg-secondary">${reg.receipt_number}</span></td>
            <td><code class="light-code">${reg.light_code}</code></td>
            <td class="text-center"><small>${moment(reg.offer_date).format('DD/MM/YYYY')}</small></td>
            <td class="text-center"><small>${moment(reg.expiry_date).format('DD/MM/YYYY')}</small></td>
            <td class="text-end">${PagodaAPI.utils.formatCurrency(reg.merit_amount)}</td>
            <td>
                <span class="badge bg-${reg.status === 'active' ? 'success' : reg.status === 'expired' ? 'warning' : 'secondary'}">
                    ${reg.status}
                </span>
            </td>
        </tr>
    `).join('') || '<tr><td colspan="6" class="text-center text-muted py-3">No registrations yet</td></tr>';

            // ✅ FIX: Get statistics from data.statistics object
            const totalRegistrations = statistics.total_registrations || 0;
            const activeRegistrations = statistics.active_registrations || 0;
            const totalMerit = statistics.total_merit_contributed || 0; // Note: "total_merit_contributed"

            const modalHtml = `
        <div class="modal fade" id="devoteeModal" tabindex="-1">
            <div class="modal-dialog modal-lg">
                <div class="modal-content">
                    <div class="modal-header bg-primary text-white">
                        <h5 class="modal-title">
                            <i class="bi bi-person me-2"></i>
                            Devotee Details
                        </h5>
                        <button type="button" class="btn-close btn-close-white" data-bs-dismiss="modal"></button>
                    </div>
                    <div class="modal-body">
                        <div class="row g-4">
                            <!-- Personal Information -->
                            <div class="col-md-6">
                                <h6 class="border-bottom pb-2 mb-3">
                                    <i class="bi bi-person-badge me-2"></i>Personal Information
                                </h6>
                                <table class="table table-sm table-borderless">
                                    <tr>
                                        <td class="text-muted" width="40%">Name (English):</td>
                                        <td><strong>${devotee.name_english}</strong></td>
                                    </tr>
                                    ${devotee.name_chinese ? `
                                    <tr>
                                        <td class="text-muted">Name (Chinese):</td>
                                        <td><strong>${devotee.name_chinese}</strong></td>
                                    </tr>
                                    ` : ''}
                                    <tr>
                                        <td class="text-muted">NRIC:</td>
                                        <td>${devotee.nric}</td>
                                    </tr>
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
                                        <td>${devotee.email || '-'}</td>
                                    </tr>
                                    <tr>
                                        <td class="text-muted">Registered On:</td>
                                        <td>${moment(devotee.created_at).format('DD/MM/YYYY')}</td>
                                    </tr>
                                </table>
                            </div>
                            
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
                                                <h4 class="text-info mb-1">${PagodaAPI.utils.formatCurrency(totalMerit)}</h4>
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
                        <button type="button" class="btn btn-outline-primary btn-edit-devotee-modal" data-id="${devotee.id}">
                            <i class="bi bi-pencil"></i> Edit
                        </button>
                        <button type="button" class="btn btn-success btn-new-registration-modal" data-id="${devotee.id}">
                            <i class="bi bi-plus-circle"></i> New Registration
                        </button>
                    </div>
                </div>
            </div>
        </div>
    `;

            $('#devoteeModal').remove();
            $('body').append(modalHtml);
            const modal = new bootstrap.Modal(document.getElementById('devoteeModal'));
            modal.show();

            // ✅ FIX: Add proper event handlers for modal buttons
            const self = this;

            $('#devoteeModal').on('click', '.btn-edit-devotee-modal', function () {
                const id = $(this).data('id');
                modal.hide();
                setTimeout(() => {
                    self.editDevotee(id);
                }, 300);
            });

            $('#devoteeModal').on('click', '.btn-new-registration-modal', function () {
                const id = $(this).data('id');
                modal.hide();
                setTimeout(() => {
                    self.newRegistrationForDevotee(id);
                }, 300);
            });

            $('#devoteeModal').on('hidden.bs.modal', function () {
                $(this).remove();
            });
        },

        // Show add devotee modal
        showAddDevoteeModal: function () {
            const self = this;

            const modalHtml = `
                <div class="modal fade" id="addDevoteeModal" tabindex="-1">
                    <div class="modal-dialog">
                        <div class="modal-content">
                            <div class="modal-header bg-success text-white">
                                <h5 class="modal-title">
                                    <i class="bi bi-person-plus me-2"></i>
                                    Add New Devotee
                                </h5>
                                <button type="button" class="btn-close btn-close-white" data-bs-dismiss="modal"></button>
                            </div>
                            <form id="addDevoteeForm">
                                <div class="modal-body">
                                    <div class="row g-3">
                                        <div class="col-12">
                                            <label class="form-label">Name (English) *</label>
                                            <input type="text" class="form-control" name="name_english" required>
                                        </div>
                                        <div class="col-12">
                                            <label class="form-label">Name (Chinese)</label>
                                            <input type="text" class="form-control" name="name_chinese">
                                        </div>
                                        <div class="col-12">
                                            <label class="form-label">NRIC *</label>
                                            <input type="text" class="form-control" name="nric" required>
                                        </div>
                                        <div class="col-12">
                                            <label class="form-label">Contact Number *</label>
                                            <input type="tel" class="form-control" name="contact_no" required>
                                        </div>
                                        <div class="col-12">
                                            <label class="form-label">Email</label>
                                            <input type="email" class="form-control" name="email">
                                        </div>
                                    </div>
                                </div>
                                <div class="modal-footer">
                                    <button type="button" class="btn btn-secondary" data-bs-dismiss="modal">Cancel</button>
                                    <button type="submit" class="btn btn-success">
                                        <i class="bi bi-check-circle"></i> Add Devotee
                                    </button>
                                </div>
                            </form>
                        </div>
                    </div>
                </div>
            `;

            $('#addDevoteeModal').remove();
            $('body').append(modalHtml);
            const modal = new bootstrap.Modal(document.getElementById('addDevoteeModal'));
            modal.show();

            // Form submit
            $('#addDevoteeForm').on('submit', function (e) {
                e.preventDefault();

                const formData = {
                    name_english: $('input[name="name_english"]').val(),
                    name_chinese: $('input[name="name_chinese"]').val(),
                    nric: $('input[name="nric"]').val(),
                    contact_no: $('input[name="contact_no"]').val(),
                    email: $('input[name="email"]').val()
                };

                TempleUtils.showLoading('Adding devotee...');

                PagodaAPI.devotees.create(formData)
                    .done(function (response) {
                        if (response.success) {
                            TempleUtils.showSuccess('Devotee added successfully');
                            modal.hide();
                            self.loadDevotees();
                        }
                    })
                    .fail(function (xhr) {
                        TempleUtils.handleAjaxError(xhr, 'Failed to add devotee');
                    })
                    .always(function () {
                        TempleUtils.hideLoading();
                    });
            });

            $('#addDevoteeModal').on('hidden.bs.modal', function () {
                $(this).remove();
            });
        },

        // Edit devotee
        editDevotee: function (id) {
            const self = this;

            // Close any open modals first
            $('.modal').modal('hide');

            TempleUtils.showLoading('Loading devotee...');

            PagodaAPI.devotees.getById(id)
                .done(function (response) {
                    if (response.success && response.data) {
                        self.showEditDevoteeModal(response.data.devotee);
                    }
                })
                .fail(function (xhr) {
                    TempleUtils.handleAjaxError(xhr, 'Failed to load devotee');
                })
                .always(function () {
                    TempleUtils.hideLoading();
                });
        },

        // Show edit devotee modal
        showEditDevoteeModal: function (devotee) {
            const self = this;

            const modalHtml = `
                <div class="modal fade" id="editDevoteeModal" tabindex="-1">
                    <div class="modal-dialog">
                        <div class="modal-content">
                            <div class="modal-header bg-primary text-white">
                                <h5 class="modal-title">
                                    <i class="bi bi-pencil me-2"></i>
                                    Edit Devotee
                                </h5>
                                <button type="button" class="btn-close btn-close-white" data-bs-dismiss="modal"></button>
                            </div>
                            <form id="editDevoteeForm">
                                <div class="modal-body">
                                    <div class="row g-3">
                                        <div class="col-12">
                                            <label class="form-label">Name (English) *</label>
                                            <input type="text" class="form-control" name="name_english" value="${devotee.name_english}" required>
                                        </div>
                                        <div class="col-12">
                                            <label class="form-label">Name (Chinese)</label>
                                            <input type="text" class="form-control" name="name_chinese" value="${devotee.name_chinese || ''}">
                                        </div>
                                        <div class="col-12">
                                            <label class="form-label">NRIC *</label>
                                            <input type="text" class="form-control" name="nric" value="${devotee.nric}" required>
                                        </div>
                                        <div class="col-12">
                                            <label class="form-label">Contact Number *</label>
                                            <input type="tel" class="form-control" name="contact_no" value="${devotee.contact_no}" required>
                                        </div>
                                        <div class="col-12">
                                            <label class="form-label">Email</label>
                                            <input type="email" class="form-control" name="email" value="${devotee.email || ''}">
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

            $('#editDevoteeModal').remove();
            $('body').append(modalHtml);
            const modal = new bootstrap.Modal(document.getElementById('editDevoteeModal'));
            modal.show();

            // Form submit
            $('#editDevoteeForm').on('submit', function (e) {
                e.preventDefault();

                const formData = {
                    name_english: $('input[name="name_english"]').val(),
                    name_chinese: $('input[name="name_chinese"]').val(),
                    nric: $('input[name="nric"]').val(),
                    contact_no: $('input[name="contact_no"]').val(),
                    email: $('input[name="email"]').val()
                };

                TempleUtils.showLoading('Updating devotee...');

                PagodaAPI.devotees.update(devotee.id, formData)
                    .done(function (response) {
                        if (response.success) {
                            TempleUtils.showSuccess('Devotee updated successfully');
                            modal.hide();
                            self.loadDevotees();
                        }
                    })
                    .fail(function (xhr) {
                        TempleUtils.handleAjaxError(xhr, 'Failed to update devotee');
                    })
                    .always(function () {
                        TempleUtils.hideLoading();
                    });
            });

            $('#editDevoteeModal').on('hidden.bs.modal', function () {
                $(this).remove();
            });
        },

        // New registration for devotee
        newRegistrationForDevotee: function (devoteeId) {
            // Store devotee ID and redirect to entry form
            sessionStorage.setItem('selected_devotee_id', devoteeId);
            $('.modal').modal('hide');
            setTimeout(function () {
                TempleRouter.navigate('auspicious-light/entry');
            }, 300);
        },

        // Export devotees
        exportDevotees: function () {
            TempleUtils.showInfo('Export functionality coming soon');
            // TODO: Implement export
        },

        // Cleanup
        destroy: function () {
            console.log('Cleaning up Pagoda Devotees Management page');

            // Remove all event handlers
            this.detachEvents();

            // Clear data
            this.currentFilters = {};
            this.currentPage = 1;
            this.perPage = 25;
            this.params = null;

            // Remove any modals
            $('#devoteeModal').remove();
            $('#addDevoteeModal').remove();
            $('#editDevoteeModal').remove();
            $('.modal-backdrop').remove();
            $('body').removeClass('modal-open').css('overflow', '');

            // Clear container
            $('#page-container').empty();

            console.log('Pagoda Devotees Management page cleaned up');
        }
    };

})(jQuery, window);