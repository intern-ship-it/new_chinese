// js/pages/special-occasions/assignment-report.js
// Table Assignment History Report

(function ($, window) {
    'use strict';
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
                console.log(`Special Occasions page registered: ${pageId}`);
            },

            unregisterPage: function (pageId) {
                this.activePages.delete(pageId);
                console.log(`Special Occasions page unregistered: ${pageId}`);
                if (this.activePages.size === 0) {
                    this.cleanup();
                }
            },

            hasActivePages: function () {
                return this.activePages.size > 0;
            },

            cleanup: function () {
                const cssLink = document.getElementById(this.cssId);
                if (cssLink) cssLink.remove();
                if (typeof gsap !== 'undefined') {
                    gsap.killTweensOf("*");
                }
                $(document).off('.' + this.eventNamespace);
                $(window).off('.' + this.eventNamespace);
                this.activePages.clear();
            }
        };
    }
    if (!window.OccasionsSharedModule) {
        console.error('OccasionsSharedModule not found!');
        return;
    }
 window.SpecialOccasionsAssignmentReportPage = {
        pageId: 'occasions-assignment-report',
        eventNamespace: window.OccasionsSharedModule.eventNamespace,
        dataTable: null,
        historyRecords: [],

        init: function (params) {
            console.log('Initializing Table Assignment History Report Page...');
            window.OccasionsSharedModule.registerPage(this.pageId);

            this.render();
            this.loadHistoryReport();
            this.bindEvents();
        },

        cleanup: function () {
            console.log(`Cleaning up ${this.pageId}...`);

            if (this.dataTable) {
                this.dataTable.destroy();
                this.dataTable = null;
            }

            window.OccasionsSharedModule.unregisterPage(this.pageId);
            $(document).off(`.${this.eventNamespace}`);
            $(window).off(`.${this.eventNamespace}`);

            console.log(`${this.pageId} cleanup completed`);
        },

        render: function () {
            const html = `
                <div class="special-occasions-page occasions-assignment-report-page">
                    <!-- Page Header -->
                    <div class="occasion-header">
                        <div class="occasion-header-bg"></div>
                        <div class="container-fluid">
                            <div class="row align-items-center">
                                <div class="col-md-8">
                                    <div class="occasion-title-wrapper">
                                        <i class="bi bi-file-earmark-bar-graph occasion-header-icon"></i>
                                        <div>
                                            <h1 class="occasion-title">Table Assignment History Report</h1>
                                            <p class="occasion-subtitle">Track All Assignment Changes & Relocations</p>
                                        </div>
                                    </div>
                                </div>
                                <div class="col-md-4 text-md-end">
                               
                                    <button class="btn btn-outline-light btn-lg" id="btnBackToList">
                                        <i class="bi bi-arrow-left"></i> Back to List
                                    </button>
                                </div>
                            </div>
                        </div>
                    </div>

                    <!-- Main Content -->
                    <div class="container-fluid mt-4">
                        <!-- Filters Section -->
                        <div class="occasion-card mb-4">
                            <div class="card-header-custom">
                                <i class="bi bi-funnel"></i>
                                <span>Report Filters</span>
                            </div>
                            <div class="card-body-custom">
                                <div class="row g-3">
                                    <div class="col-md-3">
                                        <label class="form-label-custom">Booking Number</label>
                                        <input type="text" class="form-control form-control-custom" 
                                               id="filterBookingNumber" placeholder="Search by booking code">
                                    </div>
                                    <div class="col-md-2">
                                        <label class="form-label-custom">From Date</label>
                                        <input type="date" class="form-control form-control-custom" id="filterFromDate">
                                    </div>
                                    <div class="col-md-2">
                                        <label class="form-label-custom">To Date</label>
                                        <input type="date" class="form-control form-control-custom" id="filterToDate">
                                    </div>
                                    <div class="col-md-2">
                                        <label class="form-label-custom">Action Type</label>
                                        <select class="form-select form-select-custom" id="filterActionType">
                                            <option value="">All Actions</option>
                                            <option value="CREATE">Create</option>
                                            <option value="UPDATE">Update</option>
                                            <option value="RELOCATE">Relocate</option>
                                        </select>
                                    </div>
                                    <div class="col-md-3">
                                        <label class="form-label-custom">&nbsp;</label>
                                        <div class="d-flex gap-2">
                                            <button class="btn btn-primary w-100" id="btnApplyFilter">
                                                <i class="bi bi-search"></i> Apply Filters
                                            </button>
                                            <button class="btn btn-secondary" id="btnResetFilter">
                                                <i class="bi bi-arrow-counterclockwise"></i>
                                            </button>
                                        </div>
                                    </div>
                                </div>
                            </div>
                        </div>

                        <!-- Statistics Cards -->
                        <div class="row g-3 mb-4" id="statisticsCards">
                            <div class="col-md-3">
                                <div class="card bg-primary text-white">
                                    <div class="card-body">
                                        <div class="d-flex justify-content-between align-items-center">
                                            <div>
                                                <h6 class="card-subtitle mb-2 opacity-75">Total Records</h6>
                                                <h2 class="card-title mb-0" id="statTotal">0</h2>
                                            </div>
                                            <i class="bi bi-file-text" style="font-size: 3rem; opacity: 0.3;"></i>
                                        </div>
                                    </div>
                                </div>
                            </div>
                            <div class="col-md-3">
                                <div class="card bg-success text-white">
                                    <div class="card-body">
                                        <div class="d-flex justify-content-between align-items-center">
                                            <div>
                                                <h6 class="card-subtitle mb-2 opacity-75">New Assignments</h6>
                                                <h2 class="card-title mb-0" id="statCreated">0</h2>
                                            </div>
                                            <i class="bi bi-plus-circle" style="font-size: 3rem; opacity: 0.3;"></i>
                                        </div>
                                    </div>
                                </div>
                            </div>
                            <div class="col-md-3">
                                <div class="card bg-warning text-white">
                                    <div class="card-body">
                                        <div class="d-flex justify-content-between align-items-center">
                                            <div>
                                                <h6 class="card-subtitle mb-2 opacity-75">Relocations</h6>
                                                <h2 class="card-title mb-0" id="statRelocated">0</h2>
                                            </div>
                                            <i class="bi bi-shuffle" style="font-size: 3rem; opacity: 0.3;"></i>
                                        </div>
                                    </div>
                                </div>
                            </div>
                            <div class="col-md-3">
                                <div class="card bg-info text-white">
                                    <div class="card-body">
                                        <div class="d-flex justify-content-between align-items-center">
                                            <div>
                                                <h6 class="card-subtitle mb-2 opacity-75">Updates</h6>
                                                <h2 class="card-title mb-0" id="statUpdated">0</h2>
                                            </div>
                                            <i class="bi bi-pencil-square" style="font-size: 3rem; opacity: 0.3;"></i>
                                        </div>
                                    </div>
                                </div>
                            </div>
                        </div>

                        <!-- History Report Table -->
                        <div class="occasion-card">
                            <div class="card-header-custom">
                                <i class="bi bi-table"></i>
                                <span>Assignment History Details</span>
                            </div>
                            <div class="card-body-custom">
                                <div class="table-responsive">
                                    <table class="table table-hover table-bordered" id="historyTable">
                                        <thead class="table-light">
                                            <tr>
                                                <th width="100">Date & Time</th>
                                                <th width="120">Booking Code</th>
                                                <th width="100">Table Name</th>
                                                <th width="80">Row</th>
                                                <th width="80">Column</th>
                                                <th width="150">Old Assign No.</th>
                                                <th width="150">New Assign No.</th>
                                                <th width="100">Action</th>
                                                <th>Reason</th>
                                                <th width="120">Changed By</th>
                                            </tr>
                                        </thead>
                                        <tbody></tbody>
                                    </table>
                                </div>
                            </div>
                        </div>
                    </div>
                </div>

                <style>
                    .action-badge-CREATE { background: #28a745; }
                    .action-badge-UPDATE { background: #17a2b8; }
                    .action-badge-RELOCATE { background: #ffc107; color: #000; }
                </style>
            `;

            $('#page-container').html(html);
        },

        loadHistoryReport: function () {
            const self = this;
            TempleCore.showLoading(true);

            const filters = this.getFilters();

            TempleAPI.get('/special-occasions/bookings/assignments/history/report', filters)
                .done(function (response) {
                    console.log('History Report Response:', response);

                    if (response.success && response.data) {
                        self.historyRecords = response.data;
                        self.updateStatistics();
                        self.initDataTable();
                    } else {
                        self.historyRecords = [];
                        self.updateStatistics();
                        self.initDataTable();
                    }
                })
                .fail(function (xhr) {
                    console.error('Failed to load history report:', xhr);
                    TempleCore.showToast('Failed to load report data', 'error');
                    self.historyRecords = [];
                    self.updateStatistics();
                    self.initDataTable();
                })
                .always(function () {
                    TempleCore.showLoading(false);
                });
        },

        getFilters: function () {
            const filters = {};

            const bookingNumber = $('#filterBookingNumber').val().trim();
            const fromDate = $('#filterFromDate').val();
            const toDate = $('#filterToDate').val();
            const actionType = $('#filterActionType').val();

            if (bookingNumber) filters.booking_number = bookingNumber;
            if (fromDate) filters.start_date = fromDate;
            if (toDate) filters.end_date = toDate;
            if (actionType) filters.action_type = actionType;

            return filters;
        },

        updateStatistics: function () {
            const total = this.historyRecords.length;
            const created = this.historyRecords.filter(r => r.action_type === 'CREATE').length;
            const relocated = this.historyRecords.filter(r => r.action_type === 'RELOCATE').length;
            const updated = this.historyRecords.filter(r => r.action_type === 'UPDATE').length;

            $('#statTotal').text(total);
            $('#statCreated').text(created);
            $('#statRelocated').text(relocated);
            $('#statUpdated').text(updated);
        },

        initDataTable: function () {
            const self = this;

            if (this.dataTable) {
                this.dataTable.destroy();
            }

            this.dataTable = $('#historyTable').DataTable({
                data: this.historyRecords,
                columns: [
                    {
                        data: 'changed_at',
                        render: function (data) {
                            return self.formatDateTime(data);
                        }
                    },
                    { data: 'booking_number' },
                    { data: 'table_name' },
                    {
                        data: 'row_number',
                        className: 'text-center'
                    },
                    {
                        data: 'column_number',
                        className: 'text-center'
                    },
                    {
                        data: 'old_assign_number',
                        render: function (data) {
                            return data || '<span class="text-muted">-</span>';
                        }
                    },
                    {
                        data: 'new_assign_number',
                        render: function (data) {
                            return `<strong class="text-primary">${data}</strong>`;
                        }
                    },
                    {
                        data: 'action_type',
                        render: function (data) {
                            return `<span class="badge action-badge-${data}">${data}</span>`;
                        }
                    },
                    {
                        data: 'change_reason',
                        render: function (data) {
                            return data || '<span class="text-muted">-</span>';
                        }
                    },
                    { data: 'changed_by' }
                ],
                order: [[0, 'desc']],
                pageLength: 50,
                responsive: true,
                dom: '<"row"<"col-sm-12 col-md-6"l><"col-sm-12 col-md-6"f>>rtip',
                language: {
                    search: 'Search:',
                    lengthMenu: 'Show _MENU_ records',
                    info: 'Showing _START_ to _END_ of _TOTAL_ records',
                    infoEmpty: 'No records found',
                    zeroRecords: 'No matching records found'
                }
            });
        },

        formatDateTime: function (dateTimeString) {
            if (!dateTimeString) return '-';
            const date = new Date(dateTimeString);
            if (isNaN(date.getTime())) return '-';
            
            return `${date.getDate().toString().padStart(2, '0')}/${(date.getMonth() + 1).toString().padStart(2, '0')}/${date.getFullYear()}<br>
                    <small class="text-muted">${date.getHours().toString().padStart(2, '0')}:${date.getMinutes().toString().padStart(2, '0')}</small>`;
        },

        applyFilters: function () {
            this.loadHistoryReport();
            TempleCore.showToast('Filters applied', 'success');
        },

        resetFilters: function () {
            $('#filterBookingNumber').val('');
            $('#filterFromDate').val('');
            $('#filterToDate').val('');
            $('#filterActionType').val('');
            this.loadHistoryReport();
        },

        exportToExcel: function () {
            TempleCore.showToast('Excel export feature coming soon', 'info');
            // TODO: Implement Excel export using SheetJS or similar
        },

        exportToPDF: function () {
            TempleCore.showToast('PDF export feature coming soon', 'info');
            // TODO: Implement PDF export using jsPDF or similar
        },

        bindEvents: function () {
            const self = this;

            // Back to List button
            $('#btnBackToList').on('click.' + this.eventNamespace, function () {
                self.cleanup();
                TempleRouter.navigate('special-occasions');
            });

            // Filter buttons
            $('#btnApplyFilter').on('click.' + this.eventNamespace, function () {
                self.applyFilters();
            });

            $('#btnResetFilter').on('click.' + this.eventNamespace, function () {
                self.resetFilters();
            });

            // Export buttons
            $('#btnExportExcel').on('click.' + this.eventNamespace, function () {
                self.exportToExcel();
            });

            $('#btnExportPDF').on('click.' + this.eventNamespace, function () {
                self.exportToPDF();
            });
        }
    };

})(jQuery, window);