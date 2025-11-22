// frontend/js/pages/auspicious-light/index.js
// Auspicious Light Registrations Listing Page

(function ($, window) {
    'use strict';

    window.AuspiciousLightIndexPage = {
        dataTable: null,
        registrations: [],

        // Initialize page
        init: function (params) {
            const self = this;
            self.render();
            self.loadSampleData();
            self.attachEventHandlers();
        },

        // Cleanup function
        cleanup: function () {
            // Destroy DataTable
            if (this.dataTable) {
                this.dataTable.destroy();
                this.dataTable = null;
            }

            // Remove event listeners
            $(document).off('click', '#newRegistrationBtn');
            $(document).off('click', '#printReportBtn');
            $(document).off('click', '#applyFilterBtn');
            $(document).off('click', '#resetFilterBtn');
            $(document).off('click', '.btn-view-receipt');
            $(document).off('click', '.btn-edit');
            $(document).off('click', '.btn-renew');
            $(document).off('click', '.btn-delete');

            // Clear data
            this.registrations = [];
        },

        // Render page HTML
        render: function () {
            const html = `
                <div class="container-fluid p-4">
                    <!-- Header -->
                    <div class="card mb-4" style="background: linear-gradient(135deg, var(--primary-color) 0%, var(--secondary-color) 100%); border: none;">
                        <div class="card-body text-center text-white py-4">
                            <h2 class="mb-2" style="font-weight: 700;">平安灯功德登记列表</h2>
                            <h3 class="mb-0">Auspicious Light Registrations</h3>
                        </div>
                    </div>

                    <!-- Action Buttons -->
                    <div class="card mb-4 shadow-sm">
                        <div class="card-body">
                            <div class="d-flex justify-content-between align-items-center">
                                <div>
                                    <button type="button" class="btn btn-success btn-lg" id="newRegistrationBtn">
                                        <i class="bi bi-plus-circle"></i> New Registration
                                    </button>
                                </div>
                                <div>
                                    <button type="button" class="btn btn-primary btn-lg" id="printReportBtn">
                                        <i class="bi bi-printer"></i> Print Report
                                    </button>
                                </div>
                            </div>
                        </div>
                    </div>

                    <!-- Filter Section -->
                    <div class="card mb-4 shadow-sm">
                        <div class="card-header bg-light">
                            <h5 class="mb-0">
                                <i class="bi bi-funnel text-primary me-2"></i>
                                Filters / 筛选
                            </h5>
                        </div>
                        <div class="card-body">
                            <div class="row g-3">
                                <div class="col-md-3">
                                    <label class="form-label">From Date / 开始日期</label>
                                    <input type="date" class="form-control" id="filterFromDate">
                                </div>
                                <div class="col-md-3">
                                    <label class="form-label">To Date / 结束日期</label>
                                    <input type="date" class="form-control" id="filterToDate">
                                </div>
                                <div class="col-md-3">
                                    <label class="form-label">Light Option / 灯位类型</label>
                                    <select class="form-select" id="filterLightOption">
                                        <option value="">All Options</option>
                                        <option value="new_light">New Light / 新灯</option>
                                        <option value="family_light">Family Light / 全家灯</option>
                                    </select>
                                </div>
                                <div class="col-md-3">
                                    <label class="form-label">Status / 状态</label>
                                    <select class="form-select" id="filterStatus">
                                        <option value="">All Status</option>
                                        <option value="active">Active / 有效</option>
                                        <option value="expired">Expired / 已过期</option>
                                    </select>
                                </div>
                                <div class="col-12">
                                    <button type="button" class="btn btn-primary" id="applyFilterBtn">
                                        <i class="bi bi-search"></i> Apply Filter
                                    </button>
                                    <button type="button" class="btn btn-outline-secondary" id="resetFilterBtn">
                                        <i class="bi bi-arrow-counterclockwise"></i> Reset
                                    </button>
                                </div>
                            </div>
                        </div>
                    </div>

                    <!-- Registrations Table -->
                    <div class="card shadow-sm">
                        <div class="card-body">
                            <div class="table-responsive">
                                <table id="registrationsTable" class="table table-striped table-hover" style="width:100%">
                                    <thead class="table-dark">
                                        <tr>
                                            <th>Receipt No.</th>
                                            <th>Date</th>
                                            <th>Devotee</th>
                                            <th>NRIC</th>
                                            <th>Contact</th>
                                            <th>Light No.</th>
                                            <th>Light Code</th>
                                            <th>Option</th>
                                            <th>Amount (SGD)</th>
                                            <th>Expiry</th>
                                            <th>Status</th>
                                            <th>Actions</th>
                                        </tr>
                                    </thead>
                                    <tbody></tbody>
                                </table>
                            </div>
                        </div>
                    </div>
                </div>
            `;

            $('#page-container').html(html);
        },

        // Load sample data
        loadSampleData: function () {
            const self = this;

            // Sample registrations data
            this.registrations = [
                {
                    id: 1,
                    receipt_number: 'AL2025001',
                    offer_date: '2025-01-15',
                    expiry_date: '2026-01-15',
                    devotee: {
                        name_chinese: '陈大明',
                        name_english: 'TAN AH MING',
                        nric: 'S1234567A',
                        contact_no: '+65 9123 4567',
                        email: 'tan@email.com',
                        address: '123 Serangoon Road'
                    },
                    light_number: '001',
                    light_code: 'A-B1-01-001',
                    tower_code: 'A',
                    block_code: 'B1',
                    floor_number: 1,
                    light_option: 'new_light',
                    merit_amount: 200.00,
                    payment_mode: 'Cash',
                    payment_method: 'Cash',
                    payment_reference: null,
                    remarks: null,
                    status: 'active'
                },
                {
                    id: 2,
                    receipt_number: 'AL2025002',
                    offer_date: '2025-01-20',
                    expiry_date: '2026-01-20',
                    devotee: {
                        name_chinese: '黄美玲',
                        name_english: 'WONG MEI LING',
                        nric: 'S2345678B',
                        contact_no: '+65 9234 5678',
                        email: 'wong@email.com',
                        address: '456 Geylang Road'
                    },
                    light_number: '002',
                    light_code: 'A-B1-01-002',
                    tower_code: 'A',
                    block_code: 'B1',
                    floor_number: 1,
                    light_option: 'family_light',
                    merit_amount: 500.00,
                    payment_mode: 'Credit Card',
                    payment_method: 'Credit Card',
                    payment_reference: 'CC123456',
                    remarks: 'Family blessing',
                    status: 'active'
                },
                {
                    id: 3,
                    receipt_number: 'AL2025003',
                    offer_date: '2024-06-15',
                    expiry_date: '2025-06-15',
                    devotee: {
                        name_chinese: '李志强',
                        name_english: 'LEE ZHI QIANG',
                        nric: 'S3456789C',
                        contact_no: '+65 9345 6789',
                        email: 'lee@email.com',
                        address: '789 Bukit Timah Road'
                    },
                    light_number: '003',
                    light_code: 'A-B1-02-001',
                    tower_code: 'A',
                    block_code: 'B1',
                    floor_number: 2,
                    light_option: 'new_light',
                    merit_amount: 200.00,
                    payment_mode: 'e-banking',
                    payment_method: 'e-banking',
                    payment_reference: 'EB789012',
                    remarks: null,
                    status: 'expired'
                },
                {
                    id: 4,
                    receipt_number: 'AL2025004',
                    offer_date: '2025-02-01',
                    expiry_date: '2026-02-01',
                    devotee: {
                        name_chinese: '林小芳',
                        name_english: 'LIM XIAO FANG',
                        nric: 'S4567890D',
                        contact_no: '+65 9456 7890',
                        email: 'lim@email.com',
                        address: '321 Orchard Road'
                    },
                    light_number: '004',
                    light_code: 'A-B2-01-001',
                    tower_code: 'A',
                    block_code: 'B2',
                    floor_number: 1,
                    light_option: 'new_light',
                    merit_amount: 200.00,
                    payment_mode: 'Cash',
                    payment_method: 'Cash',
                    payment_reference: null,
                    remarks: 'Health and prosperity',
                    status: 'active'
                },
                {
                    id: 5,
                    receipt_number: 'AL2025005',
                    offer_date: '2025-02-10',
                    expiry_date: '2026-02-10',
                    devotee: {
                        name_chinese: '张文华',
                        name_english: 'ZHANG WEN HUA',
                        nric: 'S5678901E',
                        contact_no: '+65 9567 8901',
                        email: 'zhang@email.com',
                        address: '654 Clementi Avenue'
                    },
                    light_number: '005',
                    light_code: 'A-B2-01-002',
                    tower_code: 'A',
                    block_code: 'B2',
                    floor_number: 1,
                    light_option: 'family_light',
                    merit_amount: 500.00,
                    payment_mode: 'Cheque',
                    payment_method: 'Cheque',
                    payment_reference: 'CHQ456789',
                    remarks: 'Annual blessing',
                    status: 'active'
                }
            ];

            // Initialize DataTable
            self.initializeDataTable();
        },

        // Initialize DataTable
        initializeDataTable: function () {
            const self = this;

            this.dataTable = $('#registrationsTable').DataTable({
                data: this.registrations,
                columns: [
                    { 
                        data: 'receipt_number',
                        render: function(data) {
                            return `<span class="badge bg-primary">${data}</span>`;
                        }
                    },
                    { 
                        data: 'offer_date',
                        render: function(data) {
                            return moment(data).format('DD/MM/YYYY');
                        }
                    },
                    { 
                        data: 'devotee',
                        render: function(data) {
                            return `<strong>${data.name_english}</strong><br><small class="text-muted">${data.name_chinese || '-'}</small>`;
                        }
                    },
                    { data: 'devotee.nric' },
                    { data: 'devotee.contact_no' },
                    { 
                        data: 'light_number',
                        render: function(data) {
                            return `<span class="badge bg-warning text-dark">${data}</span>`;
                        }
                    },
                    { 
                        data: 'light_code',
                        render: function(data) {
                            return `<code>${data}</code>`;
                        }
                    },
                    { 
                        data: 'light_option',
                        render: function(data) {
                            return data === 'new_light' 
                                ? '<span class="badge bg-info">New Light</span>' 
                                : '<span class="badge bg-success">Family Light</span>';
                        }
                    },
                    { 
                        data: 'merit_amount',
                        render: function(data) {
                            return '$' + parseFloat(data).toFixed(2);
                        }
                    },
                    { 
                        data: 'expiry_date',
                        render: function(data, type, row) {
                            const expiry = moment(data);
                            const today = moment();
                            const daysLeft = expiry.diff(today, 'days');
                            
                            let badgeClass = 'bg-success';
                            if (daysLeft < 0) badgeClass = 'bg-danger';
                            else if (daysLeft <= 30) badgeClass = 'bg-warning';
                            
                            return `
                                ${expiry.format('DD/MM/YYYY')}<br>
                                <small class="badge ${badgeClass}">${daysLeft >= 0 ? daysLeft + ' days left' : 'Expired'}</small>
                            `;
                        }
                    },
                    { 
                        data: 'status',
                        render: function(data) {
                            return data === 'active' 
                                ? '<span class="badge bg-success">Active</span>' 
                                : '<span class="badge bg-secondary">Expired</span>';
                        }
                    },
                    {
                        data: null,
                        orderable: false,
                        render: function(data, type, row) {
                            return `
                                <div class="btn-group btn-group-sm" role="group">
                                    <button type="button" class="btn btn-info btn-view-receipt" data-id="${row.id}" title="View Receipt">
                                        <i class="bi bi-printer"></i>
                                    </button>
                                    <button type="button" class="btn btn-warning btn-edit" data-id="${row.id}" title="Edit">
                                        <i class="bi bi-pencil"></i>
                                    </button>
                                    <button type="button" class="btn btn-success btn-renew" data-id="${row.id}" title="Renew">
                                        <i class="bi bi-arrow-repeat"></i>
                                    </button>
                                    <button type="button" class="btn btn-danger btn-delete" data-id="${row.id}" title="Delete">
                                        <i class="bi bi-trash"></i>
                                    </button>
                                </div>
                            `;
                        }
                    }
                ],
                order: [[1, 'desc']], // Sort by date descending
                pageLength: 25,
                responsive: true,
                dom: '<"row"<"col-sm-12 col-md-6"l><"col-sm-12 col-md-6"f>>rtip',
                language: {
                    search: "Search / 搜索:",
                    lengthMenu: "Show _MENU_ entries / 显示 _MENU_ 条",
                    info: "Showing _START_ to _END_ of _TOTAL_ entries",
                    emptyTable: "No registrations found / 没有找到记录"
                }
            });
        },

        // Attach event handlers
        attachEventHandlers: function () {
            const self = this;

            // New Registration button
            $(document).on('click', '#newRegistrationBtn', function () {
				self.cleanup();
                TempleRouter.navigate('auspicious-light/entry');
            });

            // Print Report button
            $(document).on('click', '#printReportBtn', function () {
                self.openReportPrint();
            });

            // Apply Filter button
            $(document).on('click', '#applyFilterBtn', function () {
                self.applyFilters();
            });

            // Reset Filter button
            $(document).on('click', '#resetFilterBtn', function () {
                self.resetFilters();
            });

            // View Receipt button
            $(document).on('click', '.btn-view-receipt', function () {
                const id = $(this).data('id');
                self.viewReceipt(id);
            });

            // Edit button
            $(document).on('click', '.btn-edit', function () {
                const id = $(this).data('id');
                self.editRegistration(id);
            });

            // Renew button
            $(document).on('click', '.btn-renew', function () {
                const id = $(this).data('id');
                self.renewRegistration(id);
            });

            // Delete button
            $(document).on('click', '.btn-delete', function () {
                const id = $(this).data('id');
                self.deleteRegistration(id);
            });
        },

        // Apply filters
        applyFilters: function () {
            const fromDate = $('#filterFromDate').val();
            const toDate = $('#filterToDate').val();
            const lightOption = $('#filterLightOption').val();
            const status = $('#filterStatus').val();

            // Custom filter function
            $.fn.dataTable.ext.search.push(
                function (settings, data, dataIndex) {
                    const registration = self.registrations[dataIndex];
                    
                    // Date filter
                    if (fromDate && moment(registration.offer_date).isBefore(fromDate)) {
                        return false;
                    }
                    if (toDate && moment(registration.offer_date).isAfter(toDate)) {
                        return false;
                    }
                    
                    // Light option filter
                    if (lightOption && registration.light_option !== lightOption) {
                        return false;
                    }
                    
                    // Status filter
                    if (status && registration.status !== status) {
                        return false;
                    }
                    
                    return true;
                }
            );

            // Redraw table
            this.dataTable.draw();

            TempleUtils.showSuccess('Filters applied');
        },

        // Reset filters
        resetFilters: function () {
            $('#filterFromDate').val('');
            $('#filterToDate').val('');
            $('#filterLightOption').val('');
            $('#filterStatus').val('');

            // Clear custom filters
            $.fn.dataTable.ext.search.pop();

            // Redraw table
            this.dataTable.draw();

            TempleUtils.showSuccess('Filters reset');
        },

        // View receipt
        viewReceipt: function (id) {
			this.cleanup();
            TempleRouter.navigate('auspicious-light/print', { id: id });
        },

        // Edit registration
        editRegistration: function (id) {
            const registration = this.registrations.find(r => r.id === id);
            
            if (!registration) {
                TempleUtils.showError('Registration not found');
                return;
            }

            // Navigate to edit page (future implementation)
            Swal.fire({
                title: 'Edit Registration',
                text: `Edit registration ${registration.receipt_number}?`,
                icon: 'info',
                confirmButtonText: 'OK'
            });
            
            // Future: TempleRouter.navigate('auspicious-light/edit', { id: id });
        },

        // Renew registration
        renewRegistration: function (id) {
            const self = this;
            const registration = this.registrations.find(r => r.id === id);
            
            if (!registration) {
                TempleUtils.showError('Registration not found');
                return;
            }

            Swal.fire({
                title: 'Renew Registration',
                html: `
                    <div class="text-start">
                        <p><strong>Receipt No:</strong> ${registration.receipt_number}</p>
                        <p><strong>Devotee:</strong> ${registration.devotee.name_english}</p>
                        <p><strong>Light:</strong> ${registration.light_number} (${registration.light_code})</p>
                        <p><strong>Current Expiry:</strong> ${moment(registration.expiry_date).format('DD/MM/YYYY')}</p>
                        <hr>
                        <p><strong>New Expiry:</strong> ${moment(registration.expiry_date).add(1, 'year').format('DD/MM/YYYY')}</p>
                        <p><strong>Amount:</strong> $${registration.merit_amount.toFixed(2)}</p>
                    </div>
                `,
                icon: 'question',
                showCancelButton: true,
                confirmButtonText: 'Yes, Renew',
                cancelButtonText: 'Cancel'
            }).then((result) => {
                if (result.isConfirmed) {
                    // Simulate renewal (backend will handle actual renewal)
                    TempleUtils.showLoading('Processing renewal...');
                    
                    setTimeout(function() {
                        TempleUtils.hideLoading();
                        TempleUtils.showSuccess('Registration renewed successfully');
                        
                        // Update local data
                        registration.expiry_date = moment(registration.expiry_date).add(1, 'year').format('YYYY-MM-DD');
                        registration.status = 'active';
                        
                        // Refresh table
                        self.dataTable.clear().rows.add(self.registrations).draw();
                    }, 1000);
                }
            });
        },

        // Delete registration
        deleteRegistration: function (id) {
            const self = this;
            const registration = this.registrations.find(r => r.id === id);
            
            if (!registration) {
                TempleUtils.showError('Registration not found');
                return;
            }

            Swal.fire({
                title: 'Delete Registration',
                html: `
                    <div class="text-start">
                        <p class="text-danger"><i class="bi bi-exclamation-triangle me-2"></i>This action cannot be undone!</p>
                        <hr>
                        <p><strong>Receipt No:</strong> ${registration.receipt_number}</p>
                        <p><strong>Devotee:</strong> ${registration.devotee.name_english}</p>
                        <p><strong>Light:</strong> ${registration.light_number} (${registration.light_code})</p>
                    </div>
                `,
                icon: 'warning',
                showCancelButton: true,
                confirmButtonText: 'Yes, Delete',
                cancelButtonText: 'Cancel',
                confirmButtonColor: '#d33'
            }).then((result) => {
                if (result.isConfirmed) {
                    // Simulate deletion (backend will handle actual deletion)
                    TempleUtils.showLoading('Deleting registration...');
                    
                    setTimeout(function() {
                        TempleUtils.hideLoading();
                        TempleUtils.showSuccess('Registration deleted successfully');
                        
                        // Remove from local data
                        const index = self.registrations.findIndex(r => r.id === id);
                        if (index > -1) {
                            self.registrations.splice(index, 1);
                        }
                        
                        // Refresh table
                        self.dataTable.clear().rows.add(self.registrations).draw();
                    }, 1000);
                }
            });
        },

        // Open report print window
        openReportPrint: function () {
            // Get current filter values
            const filters = {
                fromDate: $('#filterFromDate').val(),
                toDate: $('#filterToDate').val(),
                lightOption: $('#filterLightOption').val(),
                status: $('#filterStatus').val()
            };

            // Store filters in sessionStorage for report page
            sessionStorage.setItem('reportFilters', JSON.stringify(filters));
            sessionStorage.setItem('reportData', JSON.stringify(this.registrations));
			this.cleanup();
            // Navigate to report print page
            TempleRouter.navigate('auspicious-light/report');
        }
    };

})(jQuery, window);