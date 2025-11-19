// js/pages/purchase/masters/tax.js
// Tax master management

(function ($, window) {
    'use strict';

    window.PurchaseMastersTaxPage = {
        taxTable: null,
        permissions: {},
        currentUser: null,
        init: function () {
            this.currentUser = JSON.parse(localStorage.getItem(window.APP_CONFIG.STORAGE.USER) || '{}');
            const self = this;
            this.loadPermissions().then(function () {
                self.render();
                self.loadTaxes();
                self.bindEvents();
            });
        },
        loadPermissions: function () {
            const self = this;
            const userId = this.currentUser.id;

            return TempleAPI.get(`/masters/tax/user/${userId}/permissions`)
                .done(function (response) {
                    if (response.success) {
                        self.permissions = response.data || self.permissions;
                    } else {
                        self.setDefaultPermissions();
                    }
                })
                .fail(function () {
                    self.setDefaultPermissions();
                });
        },
        setDefaultPermissions: function () {
            const userType = this.currentUser?.user_type || '';
            this.permissions = {
                can_create_tax_masters: userType === 'SUPER_ADMIN' || userType === 'ADMIN',
                can_edit_tax_masters: userType === 'SUPER_ADMIN' || userType === 'ADMIN',
                can_delete_tax_masters: userType === 'SUPER_ADMIN' || userType === 'ADMIN',
                can_view_tax_masters: userType === 'SUPER_ADMIN' || userType === 'ADMIN',
            };
        },
        render: function () {
            const html = `
                <div class="container-fluid">
                    <!-- Header -->
                    <div class="row mb-4">
                        <div class="col-md-6">
                            <h4 class="page-title">Tax Master</h4>
                            <nav aria-label="breadcrumb">
                                <ol class="breadcrumb">
                                    <li class="breadcrumb-item"><a href="#" onclick="TempleRouter.navigate('dashboard'); return false;">Dashboard</a></li>
                                    <li class="breadcrumb-item"><a href="#" onclick="TempleRouter.navigate('purchase'); return false;">Purchase</a></li>
                                    <li class="breadcrumb-item active">Tax Master</li>
                                </ol>
                            </nav>
                        </div>
                        <div class="col-md-6 text-end">
                         ${this.permissions.can_create_tax_masters ? `
                            <button class="btn btn-primary" id="btnAddTax">
                                <i class="bi bi-plus-circle"></i> Add New Tax
                            </button>
                            `: ''}
                        </div>
                    </div>
                    
                    <!-- Tax List -->
                    <div class="card">
                        <div class="card-body">
                            <div class="table-responsive">
                                <table class="table table-hover" id="taxTable">
                                    <thead>
                                        <tr>
                                            <th>#</th>
                                            <th>Tax Name</th>
                                            <th>Applicable For</th>
                                            <th>Rate (%)</th>
                                            <th>Ledger Account</th>
                                            <th>Status</th>
                                            <th>Actions</th>
                                        </tr>
                                    </thead>
                                    <tbody id="taxTableBody">
                                        <tr>
                                            <td colspan="7" class="text-center">Loading...</td>
                                        </tr>
                                    </tbody>
                                </table>
                            </div>
                        </div>
                    </div>
                </div>
                
                <!-- Tax Modal -->
                <div class="modal fade" id="taxModal" tabindex="-1">
                    <div class="modal-dialog">
                        <div class="modal-content">
                            <div class="modal-header">
                                <h5 class="modal-title" id="taxModalTitle">Add Tax</h5>
                                <button type="button" class="btn-close" data-bs-dismiss="modal"></button>
                            </div>
                            <div class="modal-body">
                                <form id="taxForm">
                                    <input type="hidden" id="taxId">
                                    
                                    <div class="mb-3">
                                        <label class="form-label">Tax Name <span class="text-danger">*</span></label>
                                        <input type="text" class="form-control" id="taxName" required>
                                    </div>
                                    
                                    <div class="mb-3">
                                        <label class="form-label">Applicable For <span class="text-danger">*</span></label>
                                        <select class="form-select" id="applicableFor" required>
                                            <option value="both">Both Products & Services</option>
                                            <option value="product">Products Only</option>
                                            <option value="service">Services Only</option>
                                        </select>
                                    </div>
                                    
                                    <div class="mb-3">
                                        <label class="form-label">Tax Rate (%) <span class="text-danger">*</span></label>
                                        <input type="number" class="form-control" id="taxRate" step="0.01" min="0" max="100" required>
                                    </div>
                                    
                                    <div class="mb-3">
                                        <label class="form-label">Ledger Account <span class="text-danger">*</span></label>
                                        <select class="form-select" id="ledgerId">
                                            <option value="">Select Ledger</option>
                                        </select>
                                    </div>
                                    
                                    <div class="mb-3">
                                        <label class="form-label">Status</label>
                                        <select class="form-select" id="taxStatus">
                                            <option value="1">Active</option>
                                            <option value="0">Inactive</option>
                                        </select>
                                    </div>
                                </form>
                            </div>
                            <div class="modal-footer">
                                <button type="button" class="btn btn-secondary" data-bs-dismiss="modal">Cancel</button>
                                <button type="button" class="btn btn-primary" id="btnSaveTax">Save Tax</button>
                            </div>
                        </div>
                    </div>
                </div>
            `;

            $('#page-container').html(html);
        },

        loadTaxes: function () {
            const self = this;

            TempleAPI.get('/masters/tax')
                .done(function (response) {
                    if (response.success) {
                        self.displayTaxes(response.data.data, self.permissions);
                    }
                })
                .fail(function () {
                    TempleCore.showToast('Failed to load taxes', 'error');
                });
        },

        displayTaxes: function (taxes, permissions) {
            let html = '';
            const self = this;

            if (taxes.length === 0) {
                html = '<tr><td colspan="7" class="text-center">No taxes found</td></tr>';
            } else {
                $.each(taxes, function (index, tax) {
                    const statusBadge = tax.status == 1 ?
                        '<span class="badge bg-success">Active</span>' :
                        '<span class="badge bg-secondary">Inactive</span>';

                    html += `
                        <tr>
                            <td>${index + 1}</td>
                            <td>${tax.name}</td>
                            <td>${self.formatApplicableFor(tax.applicable_for)}</td>
                            <td>${tax.percent}%</td>
                            <td>${tax.ledger_name ? tax.ledger_name : '-'}</td>
                            <td>${statusBadge}</td>
                            <td>
                              ${permissions.can_edit_tax_masters ? `
                                <button class="btn btn-sm btn-info" onclick="PurchaseMastersTaxPage.editTax('${tax.id}')">
                                    <i class="bi bi-pencil"></i>
                                </button>`: ''}
                                  ${permissions.can_delete_tax_masters ? `
                                <button class="btn btn-sm btn-danger" onclick="PurchaseMastersTaxPage.deleteTax('${tax.id}')">
                                    <i class="bi bi-trash"></i>
                                </button>`: ''}
                            </td>
                        </tr>
                    `;
                });
            }

            $('#taxTableBody').html(html);
        },

        formatApplicableFor: function (type) {
            const types = {
                'both': 'Products & Services',
                'product': 'Products Only',
                'service': 'Services Only'
            };
            return types[type] || type;
        },

        bindEvents: function () {
            const self = this;

            $('#btnAddTax').on('click', function () {
                self.showTaxModal();
            });

            $('#btnSaveTax').on('click', function () {
                self.saveTax();
            });

            // Load ledgers when modal opens
            $('#taxModal').on('show.bs.modal', function () {
                self.loadLedgers();
            });
        },

        showTaxModal: function (taxId) {
            $('#taxForm')[0].reset();
            $('#taxId').val('');
            $('#taxModalTitle').text('Add Tax');

            const modal = new bootstrap.Modal(document.getElementById('taxModal'));
            modal.show();
        },

        editTax: function (taxId) {
            const self = this;
            const modal = new bootstrap.Modal(document.getElementById('taxModal'));
            modal.show();
            TempleAPI.get('/masters/tax/' + taxId)
                .done(function (response) {
                    if (response.success) {
                        const tax = response.data;
                        $('#taxId').val(tax.id);
                        $('#taxName').val(tax.name);
                        $('#applicableFor').val(tax.applicable_for);
                        $('#taxRate').val(tax.percent);
                        $('#ledgerId').val(tax.ledger_id);
                        $('#taxStatus').val(tax.status);
                        $('#taxModalTitle').text('Edit Tax');
                    } else modal.hide();
                });
        },

        saveTax: function () {
            const self = this;

            if (!$('#taxForm')[0].checkValidity()) {
                $('#taxForm')[0].reportValidity();
                return;
            }

            const taxData = {
                name: $('#taxName').val(),
                applicable_for: $('#applicableFor').val(),
                percent: $('#taxRate').val(),
                ledger_id: $('#ledgerId').val(),
                status: $('#taxStatus').val()
            };

            const taxId = $('#taxId').val();
            const url = taxId ? '/masters/tax/' + taxId : '/masters/tax';
            const method = taxId ? 'PUT' : 'POST';

            TempleCore.showLoading(true);

            TempleAPI[method.toLowerCase()](url, taxData)
                .done(function (response) {
                    if (response.success) {
                        bootstrap.Modal.getInstance(document.getElementById('taxModal')).hide();
                        TempleCore.showToast('Tax saved successfully', 'success');
                        self.loadTaxes();
                    } else {
                        TempleCore.showToast(response.message || 'Failed to save tax', 'error');
                    }
                })
                .fail(function () {
                    TempleCore.showToast('Failed to save tax', 'error');
                })
                .always(function () {
                    TempleCore.showLoading(false);
                });
        },

        deleteTax: function (taxId) {
            const self = this;

            TempleCore.showConfirm(
                'Delete Tax',
                'Are you sure you want to delete this tax?',
                function () {
                    TempleAPI.delete('/masters/tax/' + taxId)
                        .done(function (response) {
                            if (response.success) {
                                TempleCore.showToast('Tax deleted successfully', 'success');
                                self.loadTaxes();
                            }
                        });
                }
            );
        },

        loadLedgers: function () {
            TempleAPI.get('/accounts/ledgers/type/tax')
                .done(function (response) {
                    if (response.success) {
                        let options = '<option value="">Select Ledger</option>';
                        $.each(response.data.ledgers, function (index, ledger) {
                            options += `<option value="${ledger.id}">${ledger.left_code + '/' + ledger.right_code + ' ' + ledger.name}</option>`;
                        });
                        $('#ledgerId').html(options);
                    }
                });
        }
    };

})(jQuery, window);