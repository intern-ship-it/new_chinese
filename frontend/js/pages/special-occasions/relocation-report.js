// js/pages/special-occasions/relocation-report.js
// Relocation Log Report Page - Temple Events Style

(function ($, window) {
    'use strict';

    // Ensure shared module exists
    if (!window.OccasionsSharedModule) {
        window.OccasionsSharedModule = {
            moduleId: 'occasions',
            eventNamespace: 'occasions',
            cssId: 'occasions-css',
            cssPath: '/css/special-occasions.css',
            activePages: new Set(),

            loadCSS: function () {
                if (!document.getElementById(this.cssId)) {
                    const link = document.createElement('link');
                    link.id = this.cssId;
                    link.rel = 'stylesheet';
                    link.href = this.cssPath;
                    document.head.appendChild(link);
                }
            },

            registerPage: function (pageId) {
                this.activePages.add(pageId);
                this.loadCSS();
            },

            unregisterPage: function (pageId) {
                this.activePages.delete(pageId);
                if (this.activePages.size === 0) {
                    this.cleanup();
                }
            },

            cleanup: function () {
                const cssLink = document.getElementById(this.cssId);
                if (cssLink) cssLink.remove();
                if (typeof gsap !== 'undefined') gsap.killTweensOf("*");
                $(document).off('.' + this.eventNamespace);
                $(window).off('.' + this.eventNamespace);
                this.activePages.clear();
            }
        };
    }

    // ========================================
    // RELOCATION REPORT PAGE MODULE
    // ========================================
    window.SpecialOccasionsRelocationReportPage = {
        pageId: 'occasions-relocation-report',
        eventNamespace: window.OccasionsSharedModule.eventNamespace,

        // Data state
        dataTable: null,
        relocationLogs: [],
        occasions: {},
        admins: {},

        // Filter state
        filters: {
            occasion_id: null,
            start_date: null,
            end_date: null,
            changed_by: null,
            action_type: null,
            booking_number: null
        },

        // Stats modal
        statsModal: null,

        // ========================================
        // INITIALIZATION
        // ========================================
        init: function (params) {
            console.log('Initializing Relocation Log Report Page...');
            window.OccasionsSharedModule.registerPage(this.pageId);

            this.render();
            this.initDatePickers();
            this.loadOccasions();
            this.loadAdmins();
            this.loadRelocationLog();
            this.bindEvents();
        },

        cleanup: function () {
            console.log(`Cleaning up ${this.pageId}...`);

            if (this.dataTable) {
                this.dataTable.destroy();
                this.dataTable = null;
            }

            if (this.statsModal) {
                try {
                    this.statsModal.hide();
                    this.statsModal.dispose();
                } catch (e) { }
                this.statsModal = null;
            }

            window.OccasionsSharedModule.unregisterPage(this.pageId);
            $(document).off(`.${this.eventNamespace}`);
            $(window).off(`.${this.eventNamespace}`);

            $('.modal-backdrop').remove();
            $('body').removeClass('modal-open');
        },

        // ========================================
        // RENDER HTML - TEMPLE EVENTS STYLE
        // ========================================
        render: function () {
            const html = `
                <div class="relocation-report-page">
                    <style>
                        .relocation-report-page {
                            padding: 20px;
                            background: #f8f9fa;
                            min-height: 100vh;
                        }
                        
                        /* Header Section - Matching Temple Events Style */
                        .report-header {
                            background: linear-gradient(135deg, #8b2500 0%, #b8621b 50%, #e09145 100%);
                            padding: 30px 40px;
                            margin-bottom: 20px;
                            border-radius: 8px 8px 0 0;
                            box-shadow: 0 2px 4px rgba(0,0,0,0.1);
                        }
                        
                        .header-content {
                            display: flex;
                            align-items: center;
                            justify-content: space-between;
                        }
                        
                        .header-left {
                            display: flex;
                            align-items: center;
                            gap: 20px;
                        }
                        
                        .header-icon {
                            font-size: 48px;
                            color: white;
                        }
                        
                        .header-text h1 {
                            font-size: 32px;
                            font-weight: 700;
                            color: white;
                            margin: 0 0 5px 0;
                        }
                        
                        .header-text p {
                            font-size: 16px;
                            color: rgba(255,255,255,0.9);
                            margin: 0;
                        }
                        
                        .header-actions button {
                            background: rgba(255,255,255,0.2);
                            border: 2px solid white;
                            color: white;
                            font-weight: 600;
                            padding: 10px 20px;
                            border-radius: 8px;
                            transition: all 0.3s;
                        }
                        
                        .header-actions button:hover {
                            background: white;
                            color: #8b4513;
                        }
                        
                        /* Filter Section - Thin colored header + white content below */
                        .filter-header-bar {
                            background: linear-gradient(135deg, #7d1f00 0%, #a74d1a 50%, #c9813d 100%);
                            padding: 15px 40px;
                            display: flex;
                            align-items: center;
                            justify-content: space-between;
                            margin-bottom: 0;
                        }
                        
                        .filter-title {
                            font-size: 18px;
                            font-weight: 600;
                            color: white;
                            display: flex;
                            align-items: center;
                            gap: 10px;
                            margin: 0;
                        }
                        
                        .filter-title i {
                            font-size: 20px;
                        }
                        
                        .btn-clear-filters {
                            background: rgba(255,255,255,0.2);
                            border: 1px solid white;
                            color: white;
                            padding: 6px 15px;
                            border-radius: 5px;
                            font-size: 14px;
                        }
                        
                        .btn-clear-filters:hover {
                            background: white;
                            color: #8b4513;
                        }
                        
                        .filter-content {
                            background: white;
                            padding: 25px 40px;
                            margin-bottom: 20px;
                            box-shadow: 0 2px 4px rgba(0,0,0,0.1);
                        }
                        
                        .filter-content label {
                            color: #2c3e50;
                            font-weight: 600;
                            margin-bottom: 8px;
                            font-size: 14px;
                        }
                        
                        .filter-content .form-control,
                        .filter-content .form-select {
                            border: 1px solid #ddd;
                            border-radius: 6px;
                        }
                        
                        .btn-apply-filter {
                            background: #8b4513;
                            border: none;
                            color: white;
                            padding: 10px 20px;
                            border-radius: 6px;
                            font-weight: 600;
                            width: 100%;
                        }
                        
                        .btn-apply-filter:hover {
                            background: #6d3410;
                        }
                        
                        .btn-export {
                            padding: 10px 20px;
                            border-radius: 6px;
                            font-weight: 600;
                        }
                        
                        /* Table Section - Thin colored header + white content below */
                        .table-header-bar {
                            background: linear-gradient(135deg, #7d1f00 0%, #a74d1a 50%, #c9813d 100%);
                            padding: 15px 40px;
                            display: flex;
                            align-items: center;
                            justify-content: space-between;
                            margin-bottom: 0;
                        }
                        
                        .table-title {
                            font-size: 18px;
                            font-weight: 600;
                            color: white;
                            display: flex;
                            align-items: center;
                            gap: 10px;
                            margin: 0;
                        }
                        
                        .table-title i {
                            font-size: 20px;
                        }
                        
                        .record-badge {
                            background: rgba(255,255,255,0.3);
                            color: white;
                            padding: 6px 15px;
                            border-radius: 20px;
                            font-weight: 600;
                            font-size: 14px;
                        }
                        
                        .table-content {
                            background: white;
                            padding: 25px 40px;
                            box-shadow: 0 2px 4px rgba(0,0,0,0.1);
                        }
                        
                        .table-wrapper {
                            overflow-x: auto;
                        }
                        
                        #relocationLogTable {
                            width: 100%;
                        }
                        
                        #relocationLogTable thead {
                            background: #f8f9fa;
                        }
                        
                        #relocationLogTable thead th {
                            font-weight: 600;
                            color: #2c3e50;
                            border-bottom: 2px solid #dee2e6;
                            padding: 12px;
                        }
                        
                        #relocationLogTable tbody td {
                            padding: 12px;
                            vertical-align: middle;
                        }
                        
                        .booking-link {
                            color: #8b4513;
                            text-decoration: none;
                            font-weight: 600;
                        }
                        
                        .booking-link:hover {
                            text-decoration: underline;
                        }
                        
                        /* Stats cards */
                        .stats-card {
                            text-align: center;
                            padding: 20px;
                            border-radius: 8px;
                            margin-bottom: 15px;
                        }
                        
                        .stats-number {
                            font-size: 36px;
                            font-weight: bold;
                            margin-bottom: 10px;
                        }
                        
                        .stats-label {
                            font-size: 14px;
                            color: #6c757d;
                        }
                    </style>

                    <!-- Header Section -->
                    <div class="report-header">
                        <div class="header-content">
                            <div class="header-left">
                                <i class="bi bi-clock-history header-icon"></i>
                                <div class="header-text">
                                    <h1>Relocation Log Report</h1>
                                    <p>Track and analyze all seat relocation activities</p>
                                </div>
                            </div>
                            <div class="header-actions">
                                <button class="me-2" id="btnRefresh">
                                    <i class="bi bi-arrow-clockwise me-2"></i>Refresh
                                </button>
                            </div>
                        </div>
                    </div>

                    <!-- Filter Section -->
                    ${this.renderFilterSection()}

                    <!-- Table Section -->
                    ${this.renderTableSection()}

                    <!-- Statistics Modal -->
                    ${this.renderStatsModal()}
                </div>
            `;

            // Render into content area
            if ($('#content').length) {
                $('#content').html(html);
            } else if ($('.main-content').length) {
                $('.main-content').html(html);
            } else if ($('#main-content').length) {
                $('#main-content').html(html);
            } else {
                const fullHtml = `
                    <div id="sidebar-container"></div>
                    <div id="content" class="main-content">
                        ${html}
                    </div>
                `;
                $('#app').html(fullHtml);

                if (window.SidebarComponent && typeof window.SidebarComponent.init === 'function') {
                    window.SidebarComponent.init();
                }
            }
        },

        renderFilterSection: function () {
            return `
                <!-- Filter Header -->
                <div class="filter-header-bar">
                    <h5 class="filter-title">
                        <i class="bi bi-funnel"></i>
                        Filter Options
                    </h5>
                    <button class="btn-clear-filters" id="btnClearFilters">
                        <i class="bi bi-x-circle me-1"></i> Clear Filters
                    </button>
                </div>
                <!-- Filter Content -->
                <div class="filter-content">
                    <div class="row g-3 mb-3">
                        <div class="col-md-3">
                            <label class="form-label">Event</label>
                            <select class="form-select" id="filterOccasion">
                                <option value="">All Events</option>
                            </select>
                        </div>
                        <div class="col-md-2">
                            <label class="form-label">Start Date</label>
                            <input type="date" class="form-control" id="filterStartDate">
                        </div>
                        <div class="col-md-2">
                            <label class="form-label">End Date</label>
                            <input type="date" class="form-control" id="filterEndDate">
                        </div>
                        <div class="col-md-2">
                            <label class="form-label">Changed By</label>
                            <select class="form-select" id="filterAdmin">
                                <option value="">All Admins</option>
                            </select>
                        </div>
                        <div class="col-md-2">
                            <label class="form-label">Action Type</label>
                            <select class="form-select" id="filterActionType">
                                <option value="">All Actions</option>
                                <option value="RELOCATE">Relocate</option>
                                <option value="SWAP">Swap</option>
                                <option value="CREATE">Create</option>
                                <option value="UPDATE">Update</option>
                                <option value="CANCEL">Cancel</option>
                            </select>
                        </div>
                        <div class="col-md-1">
                            <label class="form-label">&nbsp;</label>
                            <button class="btn btn-apply-filter" id="btnApplyFilters">
                                <i class="bi bi-search"></i>
                            </button>
                        </div>
                    </div>
                    <div class="row g-3">
                        <div class="col-md-3">
                            <label class="form-label">Booking Number</label>
                            <input type="text" class="form-control" id="filterBookingNumber" 
                                placeholder="Search booking number...">
                        </div>
                        <div class="col-md-9 d-flex align-items-end justify-content-end">
                            <button class="btn btn-danger btn-export me-2" id="btnExportPDF">
                                <i class="bi bi-file-pdf me-1"></i> Export PDF
                            </button>
                            <button class="btn btn-success btn-export" id="btnExportExcel">
                                <i class="bi bi-file-excel me-1"></i> Export Excel
                            </button>
                        </div>
                    </div>
                </div>
            `;
        },

        renderTableSection: function () {
            return `
                <!-- Table Header -->
                <div class="table-header-bar">
                    <h5 class="table-title">
                        <i class="bi bi-table"></i>
                        Relocation Records
                    </h5>
                    <span class="record-badge" id="recordCount">0 records</span>
                </div>
                <!-- Table Content -->
                <div class="table-content">
                    <div class="table-wrapper">
                        <table class="table table-hover" id="relocationLogTable">
                            <thead>
                                <tr>
                                    <th>Date & Time</th>
                                    <th>Event</th>
                                    <th>Booking #</th>
                                    <th>Old Location</th>
                                    <th>New Location</th>
                                    <th>Action</th>
                                    <th>Reason</th>
                                    <th>Changed By</th>
                                </tr>
                            </thead>
                            <tbody></tbody>
                        </table>
                    </div>
                </div>
            `;
        },

        renderStatsModal: function () {
            return `
                <div class="modal fade" id="statsModal" tabindex="-1" data-bs-backdrop="static">
                    <div class="modal-dialog modal-xl">
                        <div class="modal-content">
                            <div class="modal-header" style="background: linear-gradient(135deg, #8b2500 0%, #b8621b 50%, #e09145 100%); color: white;">
                                <h5 class="modal-title">
                                    <i class="bi bi-graph-up me-2"></i>Relocation Statistics
                                </h5>
                                <button type="button" class="btn-close btn-close-white" data-bs-dismiss="modal"></button>
                            </div>
                            <div class="modal-body" id="statsModalBody">
                                <div class="text-center py-5">
                                    <div class="spinner-border text-primary" role="status">
                                        <span class="visually-hidden">Loading...</span>
                                    </div>
                                    <p class="mt-2 text-muted">Loading statistics...</p>
                                </div>
                            </div>
                        </div>
                    </div>
                </div>
            `;
        },

        // ========================================
        // DATE PICKERS
        // ========================================
        initDatePickers: function () {
            const today = new Date();
            const thirtyDaysAgo = new Date(today.getTime() - (30 * 24 * 60 * 60 * 1000));

            $('#filterStartDate').val(this.formatDateForInput(thirtyDaysAgo));
            $('#filterEndDate').val(this.formatDateForInput(today));
        },

        formatDateForInput: function (date) {
            const year = date.getFullYear();
            const month = String(date.getMonth() + 1).padStart(2, '0');
            const day = String(date.getDate()).padStart(2, '0');
            return `${year}-${month}-${day}`;
        },

        // ========================================
        // DATA LOADING
        // ========================================
        loadOccasions: function () {
            const self = this;

            TempleAPI.get('/special-occasions', { status: 'active' })
                .done(function (response) {
                    if (response.success && response.data) {
                        self.occasions = {};
                        response.data.forEach(function (occasion) {
                            self.occasions[occasion.id] = occasion.occasion_name_primary;
                        });

                        let optionsHTML = '<option value="">All Events</option>';
                        for (const [id, name] of Object.entries(self.occasions)) {
                            optionsHTML += `<option value="${id}">${name}</option>`;
                        }
                        $('#filterOccasion').html(optionsHTML);
                    }
                })
                .fail(function () {
                    console.error('Failed to load occasions');
                    self.occasions = {};
                });
        },

        loadAdmins: function () {
            const self = this;

            TempleAPI.get('/users', { role: 'admin' })
                .done(function (response) {
                    if (response.success && response.data) {
                        self.admins = {};
                        response.data.forEach(function (admin) {
                            const fullName = admin.name || admin.username || 'Unknown';
                            self.admins[admin.id] = fullName;
                        });

                        let optionsHTML = '<option value="">All Admins</option>';
                        for (const [id, name] of Object.entries(self.admins)) {
                            optionsHTML += `<option value="${id}">${name}</option>`;
                        }
                        $('#filterAdmin').html(optionsHTML);
                    }
                })
                .fail(function () {
                    console.error('Failed to load admins');
                    self.admins = {};
                });
        },

        loadRelocationLog: function () {
            const self = this;
            TempleCore.showLoading(true);

            const filters = this.getFilters();

            TempleAPI.get('/special-occasion-bookings/relocation-log', filters)
                .done(function (response) {
                    if (response.success && response.data) {
                        self.relocationLogs = response.data;
                        self.initDataTable();
                        self.updateRecordCount();
                    } else {
                        self.relocationLogs = [];
                        self.initDataTable();
                    }
                })
                .fail(function (xhr) {
                    console.error('Failed to load relocation log:', xhr);
                    TempleCore.showToast('Failed to load relocation log', 'error');
                    self.relocationLogs = [];
                    self.initDataTable();
                })
                .always(function () {
                    TempleCore.showLoading(false);
                });
        },

        getFilters: function () {
            const filters = {};

            const occasionId = $('#filterOccasion').val();
            const startDate = $('#filterStartDate').val();
            const endDate = $('#filterEndDate').val();
            const adminId = $('#filterAdmin').val();
            const actionType = $('#filterActionType').val();
            const bookingNumber = $('#filterBookingNumber').val();

            if (occasionId) filters.occasion_id = occasionId;
            if (startDate) filters.start_date = startDate;
            if (endDate) filters.end_date = endDate;
            if (adminId) filters.changed_by = adminId;
            if (actionType) filters.action_type = actionType;
            if (bookingNumber) filters.booking_number = bookingNumber;

            this.filters = filters;
            return filters;
        },

        // ========================================
        // DATATABLE
        // ========================================
        initDataTable: function () {
            const self = this;

            if (this.dataTable) {
                this.dataTable.destroy();
            }

            this.dataTable = $('#relocationLogTable').DataTable({
                data: this.relocationLogs,
                order: [[0, 'desc']],
                pageLength: 50,
                language: {
                    emptyTable: "No relocation records found",
                    info: "Showing _START_ to _END_ of _TOTAL_ records",
                    infoEmpty: "No records available",
                    infoFiltered: "(filtered from _MAX_ total records)",
                    lengthMenu: "Show _MENU_ records per page",
                    search: "Search:",
                    paginate: {
                        first: "First",
                        last: "Last",
                        next: "Next",
                        previous: "Previous"
                    }
                },
                columns: [
                    {
                        data: 'changed_at',
                        render: function (data) {
                            return self.formatDateTime(data);
                        }
                    },
                    {
                        data: 'event_name',
                        render: function (data) {
                            return data || 'N/A';
                        }
                    },
                    {
                        data: 'booking_number',
                        render: function (data, type, row) {
                            if (data && row.booking_id) {
                                return `<a href="#" class="booking-link" data-id="${row.booking_id}">${data}</a>`;
                            }
                            return data || 'N/A';
                        }
                    },
                    {
                        data: null,
                        render: function (data, type, row) {
                            if (row.old_table_name) {
                                return `
                                    <strong>${row.old_table_name}</strong><br>
                                    <small class="text-muted">${row.old_assign_number || 'N/A'}</small>
                                `;
                            }
                            return '<span class="text-muted">-</span>';
                        }
                    },
                    {
                        data: null,
                        render: function (data, type, row) {
                            if (row.new_table_name) {
                                return `
                                    <strong>${row.new_table_name}</strong><br>
                                    <small class="text-muted">${row.new_assign_number || 'N/A'}</small>
                                `;
                            }
                            return '<span class="text-muted">-</span>';
                        }
                    },
                    {
                        data: 'action_type',
                        render: function (data) {
                            return self.renderActionBadge(data);
                        }
                    },
                    {
                        data: 'change_reason',
                        render: function (data) {
                            if (data && data.length > 50) {
                                return `<small title="${data}">${data.substring(0, 50)}...</small>`;
                            }
                            return `<small>${data || 'N/A'}</small>`;
                        }
                    },
                    {
                        data: 'changed_by_name',
                        render: function (data) {
                            return data || 'System';
                        }
                    }
                ]
            });
        },

        renderActionBadge: function (actionType) {
            const badges = {
                'RELOCATE': 'bg-warning text-dark',
                'SWAP': 'bg-info text-white',
                'CREATE': 'bg-success text-white',
                'UPDATE': 'bg-primary text-white',
                'CANCEL': 'bg-danger text-white'
            };

            const badgeClass = badges[actionType] || 'bg-secondary text-white';
            return `<span class="badge ${badgeClass}">${actionType}</span>`;
        },

        updateRecordCount: function () {
            const count = this.relocationLogs.length;
            $('#recordCount').text(`${count} record${count !== 1 ? 's' : ''}`);
        },

        // ========================================
        // EXPORT METHODS - FIXED FOR PROPER BLOB HANDLING
        // ========================================
        exportToPDF: function () {
            const self = this;

            console.log('Starting PDF export...');
            TempleCore.showLoading(true);

            // Clean up filters - remove empty values
            const params = $.extend({}, this.filters, { format: 'pdf' });
            Object.keys(params).forEach(key => {
                if (!params[key]) delete params[key];
            });

            console.log('PDF Export params:', params);

            // Build the API URL
            const apiUrl = `${TempleAPI.getBaseUrl()}/reports/relocation-report`;

            // Use XMLHttpRequest for blob handling
            const xhr = new XMLHttpRequest();
            xhr.open('GET', apiUrl + '?' + $.param(params), true);
            xhr.responseType = 'blob';

            // Set headers
            const token = localStorage.getItem(APP_CONFIG.STORAGE.ACCESS_TOKEN) || sessionStorage.getItem(APP_CONFIG.STORAGE.ACCESS_TOKEN);
            if (token) {
                xhr.setRequestHeader('Authorization', `Bearer ${token}`);
            }
            xhr.setRequestHeader('X-Temple-ID', TempleAPI.getTempleId ? TempleAPI.getTempleId() : 'temple1');

            xhr.onload = function () {
                TempleCore.showLoading(false);

                if (this.status === 200) {
                    // Check if response is actually a blob
                    if (this.response instanceof Blob) {
                        // Check if it's an error JSON response
                        if (this.response.type === 'application/json') {
                            const reader = new FileReader();
                            reader.onload = function () {
                                try {
                                    const errorData = JSON.parse(reader.result);
                                    console.error('PDF Export Error:', errorData);
                                    TempleCore.showToast(errorData.message || 'Failed to export PDF', 'error');
                                } catch (e) {
                                    TempleCore.showToast('Failed to export PDF', 'error');
                                }
                            };
                            reader.readAsText(this.response);
                            return;
                        }

                        // Success - download the PDF
                        const blob = this.response;
                        const url = window.URL.createObjectURL(blob);
                        const a = document.createElement('a');
                        a.href = url;
                        a.download = 'Relocation_Report_' + self.formatDateForFilename(new Date()) + '.pdf';
                        document.body.appendChild(a);
                        a.click();

                        // Cleanup
                        setTimeout(function () {
                            window.URL.revokeObjectURL(url);
                            document.body.removeChild(a);
                        }, 100);

                        TempleCore.showToast('PDF downloaded successfully', 'success');
                    } else {
                        console.error('Response is not a blob');
                        TempleCore.showToast('Invalid PDF response', 'error');
                    }
                } else {
                    console.error('HTTP Error:', this.status, this.statusText);
                    TempleCore.showToast('Failed to export PDF (Status: ' + this.status + ')', 'error');
                }
            };

            xhr.onerror = function () {
                TempleCore.showLoading(false);
                console.error('Network error during PDF export');
                TempleCore.showToast('Network error - Failed to export PDF', 'error');
            };

            xhr.send();
        },

        exportToExcel: function () {
            const self = this;

            console.log('Starting Excel export...');
            TempleCore.showLoading(true);

            // Clean up filters
            const params = $.extend({}, this.filters, { format: 'excel' });
            Object.keys(params).forEach(key => {
                if (!params[key]) delete params[key];
            });

            console.log('Excel Export params:', params);

            // Build the API URL
            const apiUrl = `${TempleAPI.getBaseUrl()}/reports/relocation-report`;

            // Use XMLHttpRequest for blob handling
            const xhr = new XMLHttpRequest();
            xhr.open('GET', apiUrl + '?' + $.param(params), true);
            xhr.responseType = 'blob';

            // Set headers
            const token = localStorage.getItem(APP_CONFIG.STORAGE.ACCESS_TOKEN) || sessionStorage.getItem(APP_CONFIG.STORAGE.ACCESS_TOKEN);
            if (token) {
                xhr.setRequestHeader('Authorization', `Bearer ${token}`);
            }
            xhr.setRequestHeader('X-Temple-ID', TempleAPI.getTempleId ? TempleAPI.getTempleId() : 'temple1');

            xhr.onload = function () {
                TempleCore.showLoading(false);

                if (this.status === 200) {
                    if (this.response instanceof Blob) {
                        // Check if it's an error JSON response
                        if (this.response.type === 'application/json') {
                            const reader = new FileReader();
                            reader.onload = function () {
                                try {
                                    const errorData = JSON.parse(reader.result);
                                    console.error('Excel Export Error:', errorData);
                                    TempleCore.showToast(errorData.message || 'Failed to export Excel', 'error');
                                } catch (e) {
                                    TempleCore.showToast('Failed to export Excel', 'error');
                                }
                            };
                            reader.readAsText(this.response);
                            return;
                        }

                        // Success - download the Excel file
                        const blob = this.response;
                        const url = window.URL.createObjectURL(blob);
                        const a = document.createElement('a');
                        a.href = url;
                        a.download = 'Relocation_Report_' + self.formatDateForFilename(new Date()) + '.xlsx';
                        document.body.appendChild(a);
                        a.click();

                        // Cleanup
                        setTimeout(function () {
                            window.URL.revokeObjectURL(url);
                            document.body.removeChild(a);
                        }, 100);

                        TempleCore.showToast('Excel file downloaded successfully', 'success');
                    } else {
                        console.error('Response is not a blob');
                        TempleCore.showToast('Invalid Excel response', 'error');
                    }
                } else {
                    console.error('HTTP Error:', this.status, this.statusText);
                    TempleCore.showToast('Failed to export Excel (Status: ' + this.status + ')', 'error');
                }
            };

            xhr.onerror = function () {
                TempleCore.showLoading(false);
                console.error('Network error during Excel export');
                TempleCore.showToast('Network error - Failed to export Excel', 'error');
            };

            xhr.send();
        },

        formatDateForFilename: function (date) {
            const year = date.getFullYear();
            const month = String(date.getMonth() + 1).padStart(2, '0');
            const day = String(date.getDate()).padStart(2, '0');
            const hours = String(date.getHours()).padStart(2, '0');
            const minutes = String(date.getMinutes()).padStart(2, '0');
            return `${year}${month}${day}_${hours}${minutes}`;
        },

        // ========================================
        // STATISTICS
        // ========================================
        showStatistics: function () {
            const self = this;

            if (!this.statsModal) {
                this.statsModal = new bootstrap.Modal(document.getElementById('statsModal'));
            }
            this.statsModal.show();

            const params = {
                occasion_id: this.filters.occasion_id || null,
                start_date: this.filters.start_date || null,
                end_date: this.filters.end_date || null
            };

            TempleAPI.get('/reports/relocation-stats', params)
                .done(function (response) {
                    if (response.success && response.data) {
                        self.renderStatistics(response.data);
                    } else {
                        $('#statsModalBody').html('<div class="alert alert-warning">No statistics available</div>');
                    }
                })
                .fail(function () {
                    $('#statsModalBody').html('<div class="alert alert-danger">Failed to load statistics</div>');
                });
        },

        renderStatistics: function (stats) {
            const html = `
                <div class="row g-4">
                    <!-- Summary Cards -->
                    <div class="col-md-3">
                        <div class="stats-card" style="background: #8b4513; color: white;">
                            <div class="stats-number">${stats.total_relocations || 0}</div>
                            <div class="stats-label" style="color: white;">Total Relocations</div>
                        </div>
                    </div>
                    <div class="col-md-3">
                        <div class="stats-card" style="background: #ffc107;">
                            <div class="stats-number">${stats.by_action_type?.RELOCATE || 0}</div>
                            <div class="stats-label">Direct Relocations</div>
                        </div>
                    </div>
                    <div class="col-md-3">
                        <div class="stats-card" style="background: #17a2b8; color: white;">
                            <div class="stats-number">${stats.by_action_type?.SWAP || 0}</div>
                            <div class="stats-label" style="color: white;">Swaps</div>
                        </div>
                    </div>
                    <div class="col-md-3">
                        <div class="stats-card" style="background: #28a745; color: white;">
                            <div class="stats-number">${stats.by_action_type?.UPDATE || 0}</div>
                            <div class="stats-label" style="color: white;">Updates</div>
                        </div>
                    </div>

                    <!-- Top Admins -->
                    <div class="col-md-6">
                        <div class="card">
                            <div class="card-header bg-light">
                                <h6 class="mb-0"><i class="bi bi-people me-2"></i>Top Admins</h6>
                            </div>
                            <div class="card-body">
                                ${this.renderTopAdmins(stats.top_admins)}
                            </div>
                        </div>
                    </div>

                    <!-- Most Relocated Tables -->
                    <div class="col-md-6">
                        <div class="card">
                            <div class="card-header bg-light">
                                <h6 class="mb-0"><i class="bi bi-grid me-2"></i>Most Relocated Tables</h6>
                            </div>
                            <div class="card-body">
                                ${this.renderTopTables(stats.most_relocated_tables)}
                            </div>
                        </div>
                    </div>
                </div>
            `;

            $('#statsModalBody').html(html);
        },

        renderTopAdmins: function (admins) {
            if (!admins || admins.length === 0) {
                return '<p class="text-muted">No data available</p>';
            }

            let html = '<div class="list-group list-group-flush">';
            admins.slice(0, 10).forEach(function (admin, index) {
                html += `
                    <div class="list-group-item d-flex justify-content-between align-items-center">
                        <span>
                            <strong>${index + 1}.</strong> ${admin.admin_name}
                        </span>
                        <span class="badge bg-primary rounded-pill">${admin.count}</span>
                    </div>
                `;
            });
            html += '</div>';
            return html;
        },

        renderTopTables: function (tables) {
            if (!tables || tables.length === 0) {
                return '<p class="text-muted">No data available</p>';
            }

            let html = '<div class="list-group list-group-flush">';
            tables.slice(0, 10).forEach(function (table, index) {
                html += `
                    <div class="list-group-item d-flex justify-content-between align-items-center">
                        <span>
                            <strong>${index + 1}.</strong> ${table.table_name}
                        </span>
                        <span class="badge bg-warning text-dark rounded-pill">${table.count}</span>
                    </div>
                `;
            });
            html += '</div>';
            return html;
        },

        // ========================================
        // EVENT HANDLERS
        // ========================================
        bindEvents: function () {
            const self = this;
            const ns = '.' + this.eventNamespace;

            $(document).on('click' + ns, '#btnApplyFilters', function () {
                self.loadRelocationLog();
                TempleCore.showToast('Filters applied', 'success');
            });

            $(document).on('click' + ns, '#btnClearFilters', function () {
                self.clearFilters();
            });

            $(document).on('click' + ns, '#btnRefresh', function () {
                self.loadRelocationLog();
            });

            $(document).on('click' + ns, '#btnViewStats', function () {
                self.showStatistics();
            });

            $(document).on('click' + ns, '#btnExportPDF', function () {
                self.exportToPDF();
            });

            $(document).on('click' + ns, '#btnExportExcel', function () {
                self.exportToExcel();
            });

            $(document).on('click' + ns, '.booking-link', function (e) {
                e.preventDefault();
                const bookingId = $(this).data('id');
                self.viewBookingDetails(bookingId);
            });

            $(document).on('change' + ns, '#filterOccasion, #filterStartDate, #filterEndDate, #filterAdmin, #filterActionType', function () {
                self.loadRelocationLog();
            });

            let searchTimeout;
            $(document).on('input' + ns, '#filterBookingNumber', function () {
                clearTimeout(searchTimeout);
                searchTimeout = setTimeout(function () {
                    self.loadRelocationLog();
                }, 500);
            });
        },

        clearFilters: function () {
            $('#filterOccasion').val('');
            $('#filterStartDate').val('');
            $('#filterEndDate').val('');
            $('#filterAdmin').val('');
            $('#filterActionType').val('');
            $('#filterBookingNumber').val('');

            this.filters = {};
            this.initDatePickers();
            this.loadRelocationLog();
            TempleCore.showToast('Filters cleared', 'info');
        },

        viewBookingDetails: function (bookingId) {
            window.location.hash = `#/special-occasions/bookings/${bookingId}`;
        },

        // ========================================
        // UTILITIES
        // ========================================
        formatDateTime: function (dateTimeString) {
            if (!dateTimeString) return 'N/A';

            const date = new Date(dateTimeString);
            const day = String(date.getDate()).padStart(2, '0');
            const month = String(date.getMonth() + 1).padStart(2, '0');
            const year = date.getFullYear();
            const hours = String(date.getHours()).padStart(2, '0');
            const minutes = String(date.getMinutes()).padStart(2, '0');

            return `${day}/${month}/${year} ${hours}:${minutes}`;
        }
    };

})(jQuery, window);