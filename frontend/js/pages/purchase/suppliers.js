// js/pages/purchase/suppliers/index.js
// Supplier Management Page - FIXED with API integration for default values
(function ($, window) {
    'use strict';

    window.PurchaseSuppliersPage = {
        permissions: {},
        currentUser: null,
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
                can_create_suppliers: false,
                can_edit_suppliers: false,
                can_delete_suppliers: false,
                       can_statement_suppliers: false,
                can_view_suppliers: true,
         
            };

            // Safely check currentUser before accessing properties
            if (this.currentUser && this.currentUser.user_type) {
                const userType = this.currentUser.user_type;
                this.permissions = {
                    can_create_suppliers: userType === 'SUPER_ADMIN' || userType === 'ADMIN',
                    can_edit_suppliers: userType === 'SUPER_ADMIN' || userType === 'ADMIN',
                    can_delete_suppliers: userType === 'SUPER_ADMIN' || userType === 'ADMIN',
                    can_statement_suppliers: userType === 'SUPER_ADMIN' || userType === 'ADMIN',
                    can_view_suppliers: true
                };
            }
        },
        render: function () {
            const html = `
                <div class="container-fluid">
                    <div class="row mb-4">
                        <div class="col-md-6">
                            <h3>Supplier Management</h3>
                        </div>
                        <div class="col-md-6 text-end">
                            <button class="btn btn-primary" id="addSupplierBtn">
                                <i class="bi bi-plus-circle"></i> Add Supplier
                            </button>
                        </div>
                    </div>
                    
                    <!-- Search -->
                    <div class="card mb-4">
                        <div class="card-body">
                            <div class="row g-3">
                                <div class="col-md-4">
                                    <input type="text" class="form-control" id="searchSupplier" 
                                           placeholder="Search by name, code, email, phone...">
                                </div>
                                <div class="col-md-2">
                                    <select class="form-select" id="filterType">
                                        <option value="">All Types</option>
                                        <option value="product">Product</option>
                                        <option value="service">Service</option>
                                        <option value="both">Both</option>
                                    </select>
                                </div>
                                <div class="col-md-2">
                                    <select class="form-select" id="filterStatus">
                                        <option value="1">Active</option>
                                        <option value="0">Inactive</option>
                                        <option value="">All</option>
                                    </select>
                                </div>
                                <div class="col-md-2">
                                    <select class="form-select" id="filterVerified">
                                        <option value="">All</option>
                                        <option value="1">Verified</option>
                                        <option value="0">Unverified</option>
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
                                            <th>Credit Limit</th>
                                            <th>Balance</th>
                                            <th>Status</th>
                                            <th>Actions</th>
                                        </tr>
                                    </thead>
                                    <tbody id="supplierTableBody">
                                        <tr>
                                            <td colspan="9" class="text-center">Loading...</td>
                                        </tr>
                                    </tbody>
                                </table>
                            </div>
                        </div>
                    </div>
                </div>
                
                <!-- Supplier Modal -->
                <div class="modal fade" id="supplierModal" tabindex="-1">
                    <div class="modal-dialog modal-lg">
                        <div class="modal-content">
                            <div class="modal-header">
                                <h5 class="modal-title" id="supplierModalTitle">Add Supplier</h5>
                                <button type="button" class="btn-close" data-bs-dismiss="modal"></button>
                            </div>
                            <div class="modal-body">
                                <form id="supplierForm">
                                    <div class="row g-3">
                                        <div class="col-md-6">
                                            <label class="form-label">Supplier Name <span class="text-danger">*</span></label>
                                            <input type="text" class="form-control" id="supplierName" required>
                                        </div>
                                      
                                        <div class="col-md-6">
                                            <label class="form-label">Supplier Type <span class="text-danger">*</span></label>
                                            <select class="form-select" id="supplierType" required>
                                                <option value="">Select Type</option>
                                                <option value="product">Product Supplier</option>
                                                <option value="service">Service Provider</option>
                                                <option value="both">Both</option>
                                            </select>
                                        </div>
                                        <div class="col-md-6">
                                            <label class="form-label">Contact Person</label>
                                            <input type="text" class="form-control" id="contactPerson">
                                        </div>
                                        <div class="col-md-6">
                                            <label class="form-label">Mobile <span class="text-danger">*</span></label>
                                            <div class="input-group">
                                                <select class="form-select" style="max-width: 100px;" id="mobileCode">
                                                    <!-- Options will be populated dynamically -->
                                                </select>
                                                <input type="text" class="form-control" id="mobileNo" required>
                                            </div>
                                        </div>
                                        <div class="col-md-6">
                                            <label class="form-label">Email</label>
                                            <input type="email" class="form-control" id="email">
                                        </div>
                                        <div class="col-md-12">
                                            <label class="form-label">Address</label>
                                            <textarea class="form-control" id="address" rows="2"></textarea>
                                        </div>
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
                                                <option value="">Select Country</option>
                                                <!-- Options will be populated dynamically -->
                                            </select>
                                        </div>
                                        <div class="col-md-3">
                                            <label class="form-label">Pincode</label>
                                            <input type="text" class="form-control" id="pincode">
                                        </div>
                                        <div class="col-md-4">
                                            <label class="form-label">Tax No</label>
                                            <input type="text" class="form-control" id="gstNo">
                                        </div>
                                        <div class="col-md-4">
                                            <label class="form-label">TIN No</label>
                                            <input type="text" class="form-control" id="panNo">
                                        </div>
                                        <div class="col-md-4">
                                            <label class="form-label">Credit Limit</label>
                                            <input type="number" class="form-control" id="creditLimit" min="0" step="0.01">
                                        </div>
                                        <div class="col-md-4">
                                            <label class="form-label">Payment Terms (Days)</label>
                                            <input type="number" class="form-control" id="paymentTerms" min="0" value="30">
                                        </div>
                                        <div class="col-md-4">
                                            <div class="form-check mt-4">
                                                <input class="form-check-input" type="checkbox" id="isActive" checked>
                                                <label class="form-check-label" for="isActive">
                                                    Active
                                                </label>
                                            </div>
                                        </div>
                                        <div class="col-md-4">
                                            <div class="form-check mt-4">
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
                                <button type="button" class="btn btn-primary" id="saveSupplierBtn">Save Supplier</button>
                            </div>
                        </div>
                    </div>
                </div>
            `;

            $('#page-container').html(html);
        },

        loadData: function () {
            const self = this;

            const params = {
                search: $('#searchSupplier').val(),
                type: $('#filterType').val(),
                status: $('#filterStatus').val(),
                is_verified: $('#filterVerified').val()
            };

            TempleAPI.get('/purchase/suppliers', params)
                .done(function (response) {
                    if (response.success) {
                        self.permissions = response.permissions || self.permissions;
                        self.renderTable(response.data, self.permissions);
                    }
                })
                .fail(function () {
                    TempleCore.showToast('Failed to load suppliers', 'error');
                });
        },

        renderTable: function (data, permissions) {
            const self = this;

            const tbody = $('#supplierTableBody');

            if (!data.data || data.data.length === 0) {
                tbody.html('<tr><td colspan="9" class="text-center">No suppliers found</td></tr>');
                return;
            }

            let html = '';
            $.each(data.data, function (index, supplier) {
                // Escape supplier name and ID for safe HTML insertion
                const escapedName = (supplier.name || '').replace(/'/g, "\\'").replace(/"/g, "&quot;");
                const supplierId = supplier.id;

                html += `
                    <tr data-id="${supplier.id}">
                        <td><strong>${supplier.supplier_code}</strong></td>
                        <td>${supplier.name}
                            ${supplier.is_verified ? '<i class="bi bi-check-circle text-success"></i>' : ''}
                        </td>
                        <td><span class="badge bg-info">${supplier.supplier_type}</span></td>
                        <td>${supplier.contact_person || '-'}<br>
                            <small>${supplier.mobile_code}${supplier.mobile_no}</small>
                        </td>
                        <td>${supplier.email || '-'}</td>
                        <td>${self.formatCurrency(parseFloat(supplier.credit_limit || 0).toFixed(2))}</td>
                        <td>${self.formatCurrency(parseFloat(supplier.current_balance || 0).toFixed(2))}</td>
                        <td>
                            ${supplier.is_active ?
                        '<span class="badge bg-success">Active</span>' :
                        '<span class="badge bg-danger">Inactive</span>'}
                        </td>
                        <td>
                            <div class="btn-group btn-group-sm">
                              ${permissions && permissions.can_edit_suppliers ? `
                                <button class="btn btn-outline-primary edit-supplier" 
                                        data-id="${supplierId}" 
                                        title="Edit">
                                    <i class="bi bi-pencil"></i>
                                </button>` : ''}
                                    ${permissions && permissions.can_statement_suppliers ? `
                                <button class="btn btn-outline-info view-statement" 
                                        data-id="${supplierId}" 
                                        title="Statement">
                                    <i class="bi bi-file-text"></i>
                                </button>` : ''}
                            </div>
                        </td>
                    </tr>
                `;
            });

            tbody.html(html);
        },

        populateCountryDropdown: function (selectedCountry) {
            const self = this;
            const $countrySelect = $('#country');
            const defaultCountry = selectedCountry || 'Malaysia';

            // Check if CountryData is available
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
                // If CountryData is not loaded, load it first
                TempleCore.loadScriptOnce('/js/data/countries.js', function () {
                    return window.CountryData && window.CountryData.countries;
                }).done(function () {
                    // Recursively call after loading
                    self.populateCountryDropdown(defaultCountry);
                }).fail(function () {
                    // Fallback to basic list if countries.js fails to load
                    const basicCountries = [
                        'India', 'Malaysia', 'Singapore', 'United States', 'United Kingdom',
                        'Canada', 'Australia', 'China', 'Japan', 'Germany', 'France'
                    ];

                    $countrySelect.empty();
                    $countrySelect.append('<option value="">Select Country</option>');

                    basicCountries.forEach(country => {
                        const option = $('<option></option>')
                            .attr('value', country)
                            .text(country);

                        if (country === defaultCountry) {
                            option.prop('selected', true);
                        }

                        $countrySelect.append(option);
                    });
                });
            }
        },

        populateMobileCodeDropdown: function (selectedCode) {
            const self = this;
            const $mobileCodeSelect = $('#mobileCode');
            const defaultCode = selectedCode || '+60';

            // Clear existing options
            $mobileCodeSelect.empty();

            // First, add hardcoded options
            const hardcodedCodes = [
                { code: '+91', country: 'India' },
                { code: '+60', country: 'Malaysia' },
                { code: '+65', country: 'Singapore' }
            ];

            // Create a Set to track added codes to avoid duplicates
            const addedCodes = new Set();

            // Add hardcoded options first
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

            // Then add from CountryData if available
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

            // If the selected code wasn't found in our options, add it
            if (selectedCode && !addedCodes.has(selectedCode)) {
                const option = $('<option></option>')
                    .attr('value', selectedCode)
                    .text(selectedCode);
                option.prop('selected', true);
                $mobileCodeSelect.append(option);
            }
        },

        bindEvents: function () {
            const self = this;

            // Add supplier
            $('#addSupplierBtn').on('click', function () {
                self.showSupplierModal();
            });

            // Search
            $('#searchBtn').on('click', function () {
                self.loadData();
            });

            // Edit supplier - use data attributes instead of closest
            $(document).on('click', '.edit-supplier', function () {
                const id = $(this).data('id');
                self.showSupplierModal(id);
            });

            // Delete supplier - use data attributes
            $(document).on('click', '.delete-supplier', function () {
                const id = $(this).data('id');
                const name = $(this).data('name');
                self.checkAndDeleteSupplier(id, name);
            });

            // Save supplier
            $('#saveSupplierBtn').on('click', function () {
                self.saveSupplier();
            });

            // View statement - use data attributes
            $(document).on('click', '.view-statement', function () {
                const id = $(this).data('id');
                TempleRouter.navigate('purchase/suppliers/statement', { id: id });
            });

            // Enter key on search field
            $('#searchSupplier').on('keypress', function (e) {
                if (e.which === 13) {
                    self.loadData();
                }
            });
        },

        showSupplierModal: function (id) {
            const self = this;

            if (id) {
                // EDIT MODE - Load supplier data
                $('#supplierModalTitle').text('Edit Supplier');
                $('#supplierModal').data('supplier-id', id);

                // Load supplier data
                TempleAPI.get(`/purchase/suppliers/${id}`)
                    .done(function (response) {
                        if (response.success) {
                            const supplier = response.data;

                            // Populate all fields
                            $('#supplierName').val(supplier.name);
                            $('#supplierType').val(supplier.supplier_type);
                            $('#contactPerson').val(supplier.contact_person || '');

                            // Populate mobile code dropdown with supplier's code
                            self.populateMobileCodeDropdown(supplier.mobile_code || '+60');

                            $('#mobileNo').val(supplier.mobile_no);
                            $('#email').val(supplier.email || '');
                            $('#address').val(supplier.address || '');
                            $('#city').val(supplier.city || '');
                            $('#state').val(supplier.state || '');

                            // Populate country dropdown with the supplier's country
                            self.populateCountryDropdown(supplier.country);

                            $('#pincode').val(supplier.pincode || '');
                            $('#gstNo').val(supplier.gst_no || '');
                            $('#panNo').val(supplier.pan_no || '');
                            $('#creditLimit').val(supplier.credit_limit || 0);
                            $('#paymentTerms').val(supplier.payment_terms || 30);
                            $('#isActive').prop('checked', supplier.is_active);
                            $('#isVerified').prop('checked', supplier.is_verified);
                        }
                    })
                    .fail(function () {
                        TempleCore.showToast('Failed to load supplier details', 'error');
                        $('#supplierModal').modal('hide');
                    });
            } else {
                // ADD MODE - Fetch defaults from API
                $('#supplierModalTitle').text('Add Supplier');
                $('#supplierModal').removeData('supplier-id');
                $('#supplierForm')[0].reset();
                $('#isActive').prop('checked', true);
                $('#paymentTerms').val('30');

                // Show loading state while fetching defaults
                $('#country').prop('disabled', true);
                $('#mobileCode').prop('disabled', true);

                // Fetch default values from API
                TempleAPI.get('/settings/default-values')
                    .done(function (response) {
                        if (response.success && response.data) {
                            const defaults = response.data;

                            // Populate country dropdown with API default
                            self.populateCountryDropdown(defaults.default_country || 'Malaysia');

                            // Populate mobile code dropdown with API default
                            self.populateMobileCodeDropdown(defaults.default_mobile_code || '+60');
                        } else {
                            // Use hardcoded fallback if response structure is unexpected
                            self.populateCountryDropdown('Malaysia');
                            self.populateMobileCodeDropdown('+60');
                        }
                    })
                    .fail(function () {
                        // Fallback to hardcoded defaults if API fails
                        console.log('Failed to fetch defaults from API, using fallback values');

                        // Try to get from local temple settings first
                        const templeSettings = TempleCore.getTempleSettings();

                        if (templeSettings && (templeSettings.temple_country || templeSettings.temple_phone_code)) {
                            self.populateCountryDropdown(templeSettings.temple_country || 'Malaysia');
                            self.populateMobileCodeDropdown(templeSettings.temple_phone_code || '+60');
                        } else {
                            // Final fallback to hardcoded defaults
                            self.populateCountryDropdown('Malaysia');
                            self.populateMobileCodeDropdown('+60');
                        }
                    })
                    .always(function () {
                        // Re-enable the fields after loading
                        $('#country').prop('disabled', false);
                        $('#mobileCode').prop('disabled', false);
                    });
            }

            $('#supplierModal').modal('show');
        },

        saveSupplier: function () {
            const supplierId = $('#supplierModal').data('supplier-id');
            const isEdit = !!supplierId;

            const data = {
                name: $('#supplierName').val(),
                supplier_type: $('#supplierType').val(),
                contact_person: $('#contactPerson').val(),
                mobile_code: $('#mobileCode').val(),
                mobile_no: $('#mobileNo').val(),
                email: $('#email').val(),
                address: $('#address').val(),
                city: $('#city').val(),
                state: $('#state').val(),
                country: $('#country').val(),
                pincode: $('#pincode').val(),
                gst_no: $('#gstNo').val(),
                pan_no: $('#panNo').val(),
                credit_limit: $('#creditLimit').val() || 0,
                payment_terms: $('#paymentTerms').val() || 0,
                is_active: $('#isActive').is(':checked'),
                is_verified: $('#isVerified').is(':checked')
            };

            // Basic validation
            if (!data.name || !data.supplier_type || !data.mobile_no) {
                TempleCore.showToast('Please fill in all required fields', 'warning');
                return;
            }

            const apiCall = isEdit
                ? TempleAPI.put(`/purchase/suppliers/update/${supplierId}`, data)
                : TempleAPI.post('/purchase/suppliers', data);

            apiCall
                .done(function (response) {
                    if (response.success) {
                        $('#supplierModal').modal('hide');
                        TempleCore.showToast(
                            isEdit ? 'Supplier updated successfully' : 'Supplier created successfully',
                            'success'
                        );
                        PurchaseSuppliersPage.loadData();
                    }
                })
                .fail(function (xhr) {
                    const error = xhr.responseJSON;
                    if (error && error.errors) {
                        // Show validation errors
                        let errorMsg = 'Validation errors:\n';
                        Object.keys(error.errors).forEach(field => {
                            errorMsg += error.errors[field].join('\n') + '\n';
                        });
                        TempleCore.showToast(errorMsg, 'error');
                    } else {
                        TempleCore.showToast('Failed to save supplier', 'error');
                    }
                });
        },

        formatCurrency: function (amount) {
            return TempleCore.formatCurrency(amount);
        },

        checkAndDeleteSupplier: function (supplierId, supplierName) {
            const self = this;

            TempleCore.showLoading(true);

            // Check if deletion is possible
            TempleAPI.get('/purchase/suppliers/check-delete/' + supplierId)
                .done(function (response) {
                    if (response && response.success && response.data) {
                        self.showDeleteConfirmation(response.data, supplierId, supplierName);
                    } else {
                        TempleCore.showToast('Invalid response from server', 'error');
                    }
                })
                .fail(function (xhr) {
                    // Handle error response properly
                    const error = xhr.responseJSON;
                    TempleCore.showToast(error?.message || 'Failed to check supplier status', 'error');
                })
                .always(function () {
                    TempleCore.showLoading(false);
                });
        },

        showDeleteConfirmation: function (checkData, supplierId, supplierName) {
            const self = this;

            // Add safety check for checkData
            if (!checkData) {
                TempleCore.showToast('Invalid deletion check data', 'error');
                return;
            }

            // Create modal HTML
            let modalHtml = `
        <div class="modal fade" id="deleteSupplierModal" tabindex="-1">
            <div class="modal-dialog">
                <div class="modal-content">
                    <div class="modal-header ${checkData.can_delete ? 'bg-warning' : 'bg-danger'} text-white">
                        <h5 class="modal-title">
                            ${checkData.can_delete ? 'Confirm Delete' : 'Cannot Delete'}
                        </h5>
                        <button type="button" class="btn-close btn-close-white" data-bs-dismiss="modal"></button>
                    </div>
                    <div class="modal-body">`;

            if (!checkData.can_delete) {
                // Show blockers
                modalHtml += `
            <div class="alert alert-danger">
                <i class="bi bi-exclamation-triangle-fill"></i> 
                <strong>This supplier cannot be deleted due to:</strong>
                <ul class="mt-2 mb-0">`;

                if (checkData.blockers && Array.isArray(checkData.blockers)) {
                    checkData.blockers.forEach(blocker => {
                        modalHtml += `<li>${blocker}</li>`;
                    });
                } else {
                    modalHtml += `<li>Unknown restriction</li>`;
                }

                modalHtml += `
                </ul>
            </div>
            <p>Please resolve these issues before attempting to delete.</p>`;
            } else {
                // Can delete - show warnings
                modalHtml += `
            <p>Are you sure you want to delete supplier "<strong>${supplierName || 'Unknown'}</strong>"?</p>`;

                if (checkData.warnings && Array.isArray(checkData.warnings) && checkData.warnings.length > 0) {
                    modalHtml += `
                <div class="alert alert-warning">
                    <i class="bi bi-exclamation-triangle"></i> <strong>Warning:</strong>
                    <ul class="mt-2 mb-0">`;

                    checkData.warnings.forEach(warning => {
                        modalHtml += `<li>${warning}</li>`;
                    });

                    modalHtml += `
                    </ul>
                </div>`;
                }

                // Add second confirmation checkbox
                modalHtml += `
            <div class="form-check mt-3">
                <input class="form-check-input" type="checkbox" id="confirmDelete">
                <label class="form-check-label" for="confirmDelete">
                    I understand that this action cannot be undone and all associated data will be permanently deleted
                </label>
            </div>`;
            }

            modalHtml += `
                    </div>
                    <div class="modal-footer">
                        <button type="button" class="btn btn-secondary" data-bs-dismiss="modal">Cancel</button>`;

            if (checkData.can_delete) {
                modalHtml += `
                        <button type="button" class="btn btn-danger" id="confirmDeleteSupplierBtn" disabled>
                            <i class="bi bi-trash"></i> Delete Supplier
                        </button>`;
            }

            modalHtml += `
                    </div>
                </div>
            </div>
        </div>`;

            // Remove existing modal if any
            $('#deleteSupplierModal').remove();

            // Add modal to body
            $('body').append(modalHtml);

            // Bind events
            if (checkData.can_delete) {
                $('#confirmDelete').on('change', function () {
                    $('#confirmDeleteSupplierBtn').prop('disabled', !$(this).is(':checked'));
                });

                $('#confirmDeleteSupplierBtn').on('click', function () {
                    self.executeDeleteSupplier(supplierId);
                });
            }

            // Show modal
            const modal = new bootstrap.Modal(document.getElementById('deleteSupplierModal'));
            modal.show();
        },

        executeDeleteSupplier: function (supplierId) {
            const self = this;

            TempleCore.showLoading(true);

            TempleAPI.delete('/purchase/suppliers/delete/' + supplierId)
                .done(function (response) {
                    if (response.success) {
                        $('#deleteSupplierModal').modal('hide');
                        TempleCore.showToast(response.message || 'Supplier deleted successfully', 'success');
                        self.loadData();
                    }
                })
                .fail(function (xhr) {
                    const error = xhr.responseJSON;
                    TempleCore.showToast(error.message || 'Failed to delete supplier', 'error');
                })
                .always(function () {
                    TempleCore.showLoading(false);
                });
        }
    };
})(jQuery, window);