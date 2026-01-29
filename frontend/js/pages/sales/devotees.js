// js/pages/sales/devotees.js
// Sales Devotees Management - UI Updated to match Suppliers
(function ($, window) {
    'use strict';

    window.SalesDevoteesPage = {
        permissions: {},
        currentUser: null,
        pagination: {
            current_page: 1,
            last_page: 1,
            per_page: 25,
            total: 0
        },

        init: function () {
            const self = this;

            // Load countries data first if not already loaded
            TempleCore.loadScriptOnce('/js/data/countries.js', function () {
                return window.CountryData && window.CountryData.countries;
            }).always(function () {
                self.currentUser = JSON.parse(localStorage.getItem(window.APP_CONFIG.STORAGE.USER) || '{}');

                // Continue with initialization regardless
                self.render();
                self.loadData();
                self.bindEvents();
                self.loadPermissions();
            });
        },

        // Load permissions
        loadPermissions: function () {
            // Set defaults first
            this.permissions = {
                can_create_devotees: false,
                can_edit_devotees: false,
                can_delete_devotees: false,
                can_view_devotees: true,
            };

            // Safely check currentUser before accessing properties
            if (this.currentUser && this.currentUser.user_type) {
                const userType = this.currentUser.user_type;
                // Assuming similar permission structure to suppliers for admins, 
                // but strictly we should check specific permissions if available or default to Admin power
                const isAdmin = userType === 'SUPER_ADMIN' || userType === 'ADMIN';

                this.permissions = {
                    can_create_devotees: isAdmin, // Or check specific permission if needed
                    can_edit_devotees: isAdmin,
                    can_delete_devotees: isAdmin,
                    can_view_devotees: true
                };

                // If backend returns permissions in loadData, we update them there
            }
        },

        render: function () {
            const html = `
                <div class="container-fluid">
                    <div class="row mb-4">
                        <div class="col-md-6">
                            <h3>Devotees Management</h3>
                        </div>
                        <div class="col-md-6 text-end">
                            <button class="btn btn-primary" id="addDevoteeBtn">
                                <i class="bi bi-plus-circle"></i> Add Devotee
                            </button>
                        </div>
                    </div>
                    
                    <!-- Search -->
                    <div class="card mb-4">
                        <div class="card-body">
                            <div class="row g-3">
                                <div class="col-md-4">
                                    <input type="text" class="form-control" id="searchDevotee" 
                                           placeholder="Search by name, mobile, email...">
                                </div>
                                <div class="col-md-2">
                                    <select class="form-select" id="filterType">
                                        <option value="">All Types</option>
                                        <option value="sales">Sales</option>
                                        <option value="hall_booking">Hall Booking</option>
                                        <option value="event_booking">Event Booking</option>
                                        <option value="rom">ROM</option>
                                        <option value="lamp_booking">Lamp Booking</option>
                                    </select>
                                </div>
                                <div class="col-md-2">
                                    <select class="form-select" id="filterStatus">
                                        <option value="">All Status</option>
                                        <option value="active">Active</option>
                                        <option value="inactive">Inactive</option>
                                    </select>
                                </div>
                                <div class="col-md-2">
                                    <select class="form-select" id="filterVerified">
                                        <option value="">All</option>
                                        <option value="true">Verified</option>
                                        <option value="false">Not Verified</option>
                                    </select>
                                </div>
                                <div class="col-md-2">
                                    <button class="btn btn-secondary w-100" id="searchBtn">
                                        <i class="bi bi-search"></i> Search
                                    </button>
                                </div>
                            </div>
                        </div>
                    </div>
                    
                    <!-- Data Table -->
                    <div class="card">
                        <div class="card-body">
                            <div class="table-responsive">
                                <table class="table table-hover">
                                    <thead>
                                        <tr>
                                            <th>Code</th>
                                            <th>Name</th>
                                            <th>Type</th>
                                            <th>Contact</th>
                                            <th>Email</th>
                                            <th>City</th>
                                            <th>Status</th>
                                            <th>Actions</th>
                                        </tr>
                                    </thead>
                                    <tbody id="devoteeTableBody">
                                        <tr>
                                            <td colspan="8" class="text-center">Loading...</td>
                                        </tr>
                                    </tbody>
                                </table>
                            </div>
                            <!-- Pagination -->
                            <div class="d-flex justify-content-end mt-3" id="paginationContainer">
                            </div>
                        </div>
                    </div>
                </div>
                
                <!-- Devotee Modal -->
                <div class="modal fade" id="devoteeModal" tabindex="-1">
                    <div class="modal-dialog modal-lg">
                        <div class="modal-content">
                            <div class="modal-header">
                                <h5 class="modal-title" id="devoteeModalTitle">Add Devotee</h5>
                                <button type="button" class="btn-close" data-bs-dismiss="modal"></button>
                            </div>
                            <div class="modal-body">
                                <form id="devoteeForm">
                                    <input type="hidden" id="devoteeId">
                                    <div class="row g-3">
                                        <!-- Row 1 -->
                                        <div class="col-md-6">
                                            <label class="form-label">Customer Name <span class="text-danger">*</span></label>
                                            <input type="text" class="form-control" id="customerName" required>
                                        </div>
                                        <div class="col-md-6">
                                            <label class="form-label">Customer Type <span class="text-danger">*</span></label>
                                            <select class="form-select" id="customerType" multiple required>
                                                <option value="sales">Sales</option>
                                                <option value="hall_booking">Hall Booking</option>
                                                <option value="event_booking">Event Booking</option>
                                                <option value="rom">ROM</option>
                                                <option value="lamp_booking">Lamp Booking</option>
                                            </select>
                                        </div>

                                        <!-- Row 2 -->
                                        <div class="col-md-6">
                                            <label class="form-label">Mobile <span class="text-danger">*</span></label>
                                            <div class="input-group">
                                                <select class="form-select" style="max-width: 100px;" id="mobileCode">
                                                    <option value="+60" selected>+60</option>
                                                </select>
                                                <input type="text" class="form-control" id="mobile" required>
                                            </div>
                                        </div>
                                        <div class="col-md-6">
                                            <label class="form-label">Email</label>
                                            <input type="email" class="form-control" id="email" placeholder="customer@example.com">
                                        </div>

                                        <!-- Row 3 -->
                                        <div class="col-md-12">
                                            <label class="form-label">Address</label>
                                            <textarea class="form-control" id="address" rows="2" placeholder="Enter full address"></textarea>
                                        </div>

                                        <!-- Row 4 -->
                                        <div class="col-md-3">
                                            <label class="form-label">City</label>
                                            <input type="text" class="form-control" id="city">
                                        </div>
                                        <div class="col-md-3">
                                            <label class="form-label">State</label>
                                            <input type="text" class="form-control" id="state">
                                        </div>
                                        <div class="col-md-3">
                                            <label class="form-label">Country</label>
                                            <select class="form-select" id="country">
                                                <option value="Malaysia">Malaysia</option>
                                            </select>
                                        </div>
                                        <div class="col-md-3">
                                            <label class="form-label">Pincode</label>
                                            <input type="text" class="form-control" id="pincode">
                                        </div>

                                        <!-- Row 5 -->
                                        <div class="col-md-6">
                                            <label class="form-label">TIN No</label>
                                            <input type="text" class="form-control" id="tinNo">
                                        </div>
                                        <div class="col-md-6">
                                            <label class="form-label">Notes</label>
                                            <input type="text" class="form-control" id="notes">
                                        </div>

                                        <!-- Row 6 -->
                                        <div class="col-md-6">
                                            <div class="form-check mt-3">
                                                <input class="form-check-input" type="checkbox" id="isActive" checked>
                                                <label class="form-check-label" for="isActive">
                                                    Active
                                                </label>
                                            </div>
                                        </div>
                                        <div class="col-md-6">
                                            <div class="form-check mt-3">
                                                <input class="form-check-input" type="checkbox" id="isVerified">
                                                <label class="form-check-label" for="isVerified">
                                                    Verified
                                                </label>
                                            </div>
                                        </div>
                                    </div>
                                </form>
                            </div>
                            <div class="modal-footer">
                                <button type="button" class="btn btn-secondary" data-bs-dismiss="modal">Cancel</button>
                                <button type="button" class="btn btn-primary" id="saveDevoteeBtn">Save Devotee</button>
                            </div>
                        </div>
                    </div>
                </div>
            `;

            $('#page-container').html(html);

            // Initialize Select2 after rendering
            if ($.fn.select2) {
                $('#customerType').select2({
                    dropdownParent: $('#devoteeModal'),
                    placeholder: 'Select Type',
                    allowClear: true,
                    width: '100%'
                });
            }
        },

        loadData: function (page = 1) {
            const self = this;

            const params = {
                search: $('#searchDevotee').val(),
                customer_type: $('#filterType').val(),
                status: $('#filterStatus').val(),
                verified: $('#filterVerified').val(),
                page: page,
                per_page: 25 // Default per page
            };

            // Remove empty params
            Object.keys(params).forEach(key => {
                if (params[key] === '' || params[key] === null) {
                    delete params[key];
                }
            });

            TempleAPI.get('/sales/devotees', params)
                .done(function (response) {
                    if (response.success) {
                        // Update permissions if server sends them (Controller index method does send 'permissions')
                        if (response.permissions) {
                            self.permissions = response.permissions;
                        }

                        // Handle pagination data
                        const data = response.data; // This is the paginator object
                        self.renderTable(data.data, self.permissions);
                        self.renderPagination(data);
                    }
                })
                .fail(function (xhr) {
                    TempleCore.showToast('Failed to load devotees', 'error');
                });
        },

        renderTable: function (data, permissions) {
            const tbody = $('#devoteeTableBody');

            if (!data || data.length === 0) {
                tbody.html('<tr><td colspan="8" class="text-center">No devotees found</td></tr>');
                return;
            }

            const typeColors = {
                'sales': 'primary',
                'hall_booking': 'success',
                'event_booking': 'info',
                'rom': 'warning',
                'lamp_booking': 'danger'
            };

            const typeLabels = {
                'sales': 'Sales',
                'hall_booking': 'Hall Booking',
                'event_booking': 'Event Booking',
                'rom': 'ROM',
                'lamp_booking': 'Lamp Booking'
            };

            let html = '';
            $.each(data, function (index, devotee) {
                // Handle multiple types
                const types = (devotee.customer_type || '').split(',');
                let typeBadges = '';

                types.forEach(type => {
                    const typeColor = typeColors[type.trim()] || 'secondary';
                    const typeLabel = typeLabels[type.trim()] || type;
                    typeBadges += `<span class="badge bg-${typeColor} me-1">${typeLabel}</span>`;
                });

                html += `
                    <tr data-id="${devotee.id}">
                        <td><strong>${devotee.devotee_code || '-'}</strong></td>
                        <td>${devotee.customer_name}
                            ${devotee.is_verified ? '<i class="bi bi-check-circle text-success MS-1" title="Verified"></i>' : ''}
                        </td>
                        <td>${typeBadges}</td>
                        <td>
                            ${devotee.mobile_code || ''} ${devotee.mobile}<br>
                        </td>
                        <td>${devotee.email || '-'}</td>
                        <td>${devotee.city || '-'}</td>
                        <td>
                            ${devotee.is_active ?
                        '<span class="badge bg-success">Active</span>' :
                        '<span class="badge bg-secondary">Inactive</span>'}
                        </td>
                        <td>
                            <div class="btn-group btn-group-sm">
                           
                                <button class="btn btn-outline-primary edit-devotee" 
                                        data-id="${devotee.id}" 
                                        title="Edit">
                                    <i class="bi bi-pencil"></i>
                                </button>
                       
                                <button class="btn btn-outline-danger delete-devotee" 
                                        data-id="${devotee.id}" 
                                        title="Delete">
                                    <i class="bi bi-trash"></i>
                                </button>
                            </div>
                        </td>
                    </tr>
                `;
            });

            tbody.html(html);
        },

        renderPagination: function (data) {
            const self = this;
            const container = $('#paginationContainer');

            if (!data || data.last_page <= 1) {
                container.empty();
                return;
            }

            let html = '<nav><ul class="pagination pagination-sm">';

            // Previous
            html += `<li class="page-item ${data.current_page === 1 ? 'disabled' : ''}">
                        <button class="page-link" data-page="${data.current_page - 1}">Previous</button>
                     </li>`;

            // Simple range for now
            for (let i = 1; i <= data.last_page; i++) {
                if (i === 1 || i === data.last_page || (i >= data.current_page - 2 && i <= data.current_page + 2)) {
                    html += `<li class="page-item ${i === data.current_page ? 'active' : ''}">
                                <button class="page-link" data-page="${i}">${i}</button>
                             </li>`;
                } else if (i === data.current_page - 3 || i === data.current_page + 3) {
                    html += `<li class="page-item disabled"><span class="page-link">...</span></li>`;
                }
            }

            // Next
            html += `<li class="page-item ${data.current_page === data.last_page ? 'disabled' : ''}">
                        <button class="page-link" data-page="${data.current_page + 1}">Next</button>
                     </li>`;

            html += '</ul></nav>';
            container.html(html);
        },

        populateCountryDropdown: function (selectedCountry) {
            const $countrySelect = $('#country');
            const defaultCountry = selectedCountry || 'Malaysia';

            if (window.CountryData && window.CountryData.countries) {
                const countries = window.CountryData.getSortedCountries();

                $countrySelect.empty();
                $countrySelect.append('<option value="">Select Country</option>');

                countries.forEach(country => {
                    const option = $('<option></option>')
                        .attr('value', country.name)
                        .text(country.name);

                    if (country.name === defaultCountry) {
                        option.prop('selected', true);
                    }

                    $countrySelect.append(option);
                });
            } else {
                // Fallback
                $countrySelect.val(defaultCountry);
            }
        },

        populateMobileCodeDropdown: function (selectedCode) {
            const $mobileCodeSelect = $('#mobileCode');
            const defaultCode = selectedCode || '+60';

            $mobileCodeSelect.empty();

            // Set to track dupes
            const addedCodes = new Set();
            const hardcodedCodes = [
                { code: '+60', country: 'Malaysia' },
                { code: '+65', country: 'Singapore' },
                { code: '+91', country: 'India' }
            ];

            hardcodedCodes.forEach(item => {
                const option = $('<option></option>')
                    .attr('value', item.code)
                    .text(`${item.code}`);

                if (item.code === defaultCode) {
                    option.prop('selected', true);
                }

                $mobileCodeSelect.append(option);
                addedCodes.add(item.code);
            });

            if (window.CountryData && window.CountryData.countries) {
                const countries = window.CountryData.getSortedCountries();
                countries.forEach(country => {
                    if (country.phoneCode && !addedCodes.has(country.phoneCode)) {
                        const option = $('<option></option>')
                            .attr('value', country.phoneCode)
                            .text(`${country.phoneCode} (${country.name})`);

                        if (country.phoneCode === defaultCode) {
                            option.prop('selected', true);
                        }

                        $mobileCodeSelect.append(option);
                        addedCodes.add(country.phoneCode);
                    }
                });
            }

            // Ensure selected is there
            if (selectedCode && !addedCodes.has(selectedCode)) {
                $mobileCodeSelect.append($('<option selected></option>').val(selectedCode).text(selectedCode));
            }
        },

        bindEvents: function () {
            const self = this;

            // Add
            $('#addDevoteeBtn').on('click', function () {
                self.showDevoteeModal();
            });

            // Search
            $('#searchBtn').on('click', function () {
                self.loadData(1);
            });
            $('#searchDevotee').on('keypress', function (e) {
                if (e.which === 13) self.loadData(1);
            });
            $('#filterType, #filterStatus, #filterVerified').on('change', function () {
                self.loadData(1);
            });

            // Edit
            $(document).on('click', '.edit-devotee', function () {
                const id = $(this).data('id');
                self.showDevoteeModal(id);
            });

            // Delete
            $(document).on('click', '.delete-devotee', function () {
                const id = $(this).data('id');
                self.deleteDevotee(id);
            });

            // Pagination
            $(document).on('click', '#paginationContainer .page-link', function (e) {
                e.preventDefault();
                const page = $(this).data('page');
                if (page) {
                    self.loadData(page);
                }
            });

            // Save
            $('#saveDevoteeBtn').on('click', function () {
                self.saveDevotee();
            });
        },

        showDevoteeModal: function (id) {
            const self = this;

            if (id) {
                $('#devoteeModalTitle').text('Edit Devotee');
                $('#devoteeId').val(id);

                TempleAPI.get(`/sales/devotees/${id}`)
                    .done(function (response) {
                        if (response.success) {
                            const data = response.data;
                            $('#customerName').val(data.customer_name);

                            // Handle multiple select population
                            const types = (data.customer_type || '').split(',');
                            $('#customerType').val(types).trigger('change');

                            self.populateMobileCodeDropdown(data.mobile_code || '+60');
                            $('#mobile').val(data.mobile);
                            $('#email').val(data.email || '');
                            $('#address').val(data.address || '');
                            $('#city').val(data.city || '');
                            $('#state').val(data.state || '');

                            self.populateCountryDropdown(data.country || 'Malaysia');

                            $('#pincode').val(data.pincode || '');
                            $('#tinNo').val(data.tin_no || '');
                            $('#notes').val(data.notes || '');
                            $('#isActive').prop('checked', data.is_active);
                            $('#isVerified').prop('checked', data.is_verified);

                            $('#devoteeModal').modal('show');
                        }
                    })
                    .fail(function () {
                        TempleCore.showToast('Failed to load devotee details', 'error');
                    });
            } else {
                $('#devoteeModalTitle').text('Add Devotee');
                $('#devoteeId').val('');
                $('#devoteeForm')[0].reset();
                $('#customerType').val([]).trigger('change'); // Reset Select2
                $('#isActive').prop('checked', true);

                self.populateMobileCodeDropdown('+60');
                self.populateCountryDropdown('Malaysia');

                $('#devoteeModal').modal('show');
            }
        },

        saveDevotee: function () {
            const self = this;
            const devoteeId = $('#devoteeId').val();
            const isEdit = !!devoteeId;

            const data = {
                customer_name: $('#customerName').val(),
                customer_type: $('#customerType').val(),
                mobile_code: $('#mobileCode').val(),
                mobile: $('#mobile').val(),
                email: $('#email').val(),
                address: $('#address').val(),
                city: $('#city').val(),
                state: $('#state').val(),
                country: $('#country').val(),
                pincode: $('#pincode').val(),
                tin_no: $('#tinNo').val(),
                notes: $('#notes').val(),
                is_active: $('#isActive').is(':checked'),
                is_verified: $('#isVerified').is(':checked')
            };

            if (!data.customer_name || !data.customer_type || !data.mobile) {
                TempleCore.showToast('Please fill in required fields', 'warning');
                return;
            }

            TempleUtils.showLoading(isEdit ? 'Updating...' : 'Saving...');

            const apiCall = isEdit
                ? TempleAPI.put(`/sales/devotees/${devoteeId}`, data)
                : TempleAPI.post('/sales/devotees', data);

            apiCall
                .done(function (response) {
                    if (response.success) {
                        $('#devoteeModal').modal('hide');
                        TempleCore.showToast(response.message || 'Saved successfully', 'success');
                        self.loadData(self.pagination.current_page);
                    }
                })
                .fail(function (xhr) {
                    const error = xhr.responseJSON;
                    if (error && error.errors) {
                        let msg = Object.values(error.errors).flat().join('\n');
                        TempleCore.showToast(msg, 'error');
                    } else {
                        TempleCore.showToast('Failed to save', 'error');
                    }
                })
                .always(function () {
                    TempleUtils.hideLoading();
                });
        },

        deleteDevotee: function (id) {
            const self = this;
            if (!confirm('Are you sure you want to delete this devotee?')) return;

            TempleUtils.showLoading('Deleting...');
            TempleAPI.delete(`/sales/devotees/${id}`)
                .done(function (response) {
                    if (response.success) {
                        TempleCore.showToast('Deleted successfully', 'success');
                        self.loadData(1);
                    }
                })
                .fail(function () {
                    TempleCore.showToast('Failed to delete', 'error');
                })
                .always(function () {
                    TempleUtils.hideLoading();
                });
        }
    };
})(jQuery, window);
