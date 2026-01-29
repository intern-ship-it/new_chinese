// js/pages/sales/invoices/view.js
// Sales Invoice View Page - with Packages and Addons sections
(function ($, window) {
    'use strict';

    window.SalesInvoicesViewPage = {
        init: function (params) {
            this.id = params.id;
            this.loadData();
        },

        loadData: function () {
            TempleAPI.get(`/sales/invoices/${this.id}`).done((response) => {
                if (response.success) {
                    this.render(response.data);
                }
            }).fail(() => {
                TempleCore.showToast('Failed to load invoice', 'error');
                TempleRouter.navigate('sales/invoices');
            });
        },

        /**
         * Separate items into packages and addons
         */
        separateItems: function (items) {
            const packages = [];
            const addons = [];

            if (!items || !Array.isArray(items)) {
                return { packages, addons };
            }

            items.forEach(item => {
                // Check if it's a package or addon
                // Package: item_type === 'package' OR is_addon === false
                // Addon: item_type === 'product' or 'sales_item' OR is_addon === true
                if (item.item_type === 'package' || item.is_addon === false) {
                    packages.push(item);
                } else {
                    addons.push(item);
                }
            });

            return { packages, addons };
        },

        render: function (invoice) {
            const currency = TempleCore.getCurrency();
            const customerName = invoice.customer?.name || invoice.devotee?.english_name || invoice.devotee?.customer_name || 'Walk-in Customer';
            const customerMobile = invoice.customer?.mobile || invoice.devotee?.mobile_1 || '-';
            const customerEmail = invoice.customer?.email || invoice.devotee?.email_1 || '-';
            const customerAddress = invoice.customer?.address || invoice.devotee?.address_1 || '-';

            // Separate items into packages and addons
            const { packages, addons } = this.separateItems(invoice.items);

            const html = `
                <div class="container-fluid">
                    <div class="d-flex justify-content-between align-items-center mb-4">
                        <h3>View Sales Invoice: ${invoice.invoice_number}</h3>
                        <div>
                            <button class="btn btn-secondary" onclick="window.history.back()">
                                <i class="bi bi-arrow-left"></i> Back
                            </button>
                            <button class="btn btn-info" onclick="SalesInvoicesViewPage.printInvoice('${invoice.id}')">
                                <i class="bi bi-printer"></i> Print
                            </button>
                        
                            <button class="btn btn-primary" onclick="SalesInvoicesViewPage.editInvoice('${invoice.id}')">
                                <i class="bi bi-pencil"></i> Edit
                            </button>
                        </div>
                    </div>

                    <!-- Invoice Header Card -->
                    <div class="card mb-4">
                        <div class="card-header bg-primary text-white">
                            <h5 class="mb-0">Invoice Details</h5>
                        </div>
                        <div class="card-body">
                            <div class="row">
                                <div class="col-md-3">
                                    <strong>Invoice Number:</strong><br>
                                    <span class="text-primary fs-5">${invoice.invoice_number}</span>
                                </div>
                                <div class="col-md-3">
                                    <strong>Invoice Date:</strong><br>
                                    ${moment(invoice.invoice_date).format('DD/MM/YYYY')}
                                </div>
                                <div class="col-md-3">
                                    <strong>Due Date:</strong><br>
                                    ${invoice.payment_due_date ? moment(invoice.payment_due_date).format('DD/MM/YYYY') : '-'}
                                </div>
                                <div class="col-md-3">
                                    <strong>Payment Status:</strong><br>
                                    ${this.getPaymentStatusBadge(invoice.payment_status)}
                                </div>
                            </div>
                            <div class="row mt-3">
                                <div class="col-md-3">
                                    <strong>Sales Order Ref:</strong><br>
                                    ${invoice.sales_order ? `<a href="#sales/orders/view/${invoice.sales_order.id}">${invoice.sales_order.so_number}</a>` : '-'}
                                </div>
                                <div class="col-md-3">
                                    <strong>Customer Invoice No:</strong><br>
                                    ${invoice.customer_invoice_no || '-'}
                                    
                                </div>
                                <div class="col-md-3">
                                    <strong>Invoice Status:</strong><br>
                                    ${this.getStatusBadge(invoice.status)}
                                </div>
                                <div class="col-md-3">
                                    <strong>Delivery Date:</strong><br>
                                    ${invoice.delivery_date ? moment(invoice.delivery_date).format('DD/MM/YYYY') : '-'}
                                </div>
                            </div>
                        </div>
                    </div>

                    <!-- Customer Details Card -->
                    <div class="card mb-4">
                        <div class="card-header">
                            <h5 class="mb-0">Customer Details</h5>
                        </div>
                        <div class="card-body">
                            <div class="row">
                                <div class="col-md-3">
                                    <strong>Customer Name:</strong><br>
                                    ${customerName}
                                </div>
                                <div class="col-md-3">
                                    <strong>Mobile:</strong><br>
                                    ${customerMobile}
                                </div>
                                <div class="col-md-3">
                                    <strong>Email:</strong><br>
                                    ${customerEmail}
                                </div>
                                <div class="col-md-3">
                                    <strong>Address:</strong><br>
                                    ${customerAddress}
                                </div>
                            </div>
                        </div>
                    </div>

                    <!-- Packages Section -->
                    <div class="card mb-4">
                        <div class="card-header bg-light">
                            <div class="d-flex justify-content-between align-items-center">
                                <h5 class="mb-0"><i class="bi bi-box-seam me-2"></i>Packages</h5>
                                <span class="badge bg-primary">${packages.length} item(s)</span>
                            </div>
                        </div>
                        <div class="card-body">
                            <div class="table-responsive">
                                <table class="table table-bordered table-hover">
                                    <thead class="table-light">
                                        <tr>
                                            <th style="width: 5%">#</th>
                                            <th style="width: 25%">Package</th>
                                            <th style="width: 20%">Description</th>
                                            <th style="width: 10%" class="text-center">Quantity</th>
                                            <th style="width: 10%" class="text-end">Tax</th>
                                            <th style="width: 10%" class="text-end">Amount</th>
                                            <th style="width: 10%" class="text-end">Discount</th>
                                            <th style="width: 10%" class="text-end">Total</th>
                                        </tr>
                                    </thead>
                                    <tbody>
                                        ${packages.length > 0 ? packages.map((item, index) => {
                                            const itemName = item.package?.package_name || item.package?.name || item.description || 'Package';
                                            return `
                                                <tr>
                                                    <td class="text-center">${index + 1}</td>
                                                    <td><strong>${itemName}</strong></td>
                                                    <td>${item.description || '-'}</td>
                                                    <td class="text-center">${parseFloat(item.quantity)}</td>
                                                    <td class="text-end">${currency} ${parseFloat(item.tax_amount || 0).toFixed(2)}</td>
                                                    <td class="text-end">${currency} ${parseFloat(item.unit_price).toFixed(2)}</td>
                                                    <td class="text-end">${parseFloat(item.discount_amount || 0) > 0 ? currency + ' ' + parseFloat(item.discount_amount).toFixed(2) : '-'}</td>
                                                    <td class="text-end"><strong>${currency} ${parseFloat(item.total_amount).toFixed(2)}</strong></td>
                                                </tr>
                                            `;
                                        }).join('') : `
                                            <tr>
                                                <td colspan="8" class="text-center text-muted py-3">No packages added</td>
                                            </tr>
                                        `}
                                    </tbody>
                                </table>
                            </div>
                        </div>
                    </div>

                    <!-- Addons Section -->
                    <div class="card mb-4">
                        <div class="card-header bg-light">
                            <div class="d-flex justify-content-between align-items-center">
                                <h5 class="mb-0"><i class="bi bi-plus-circle me-2"></i>Addons</h5>
                                <span class="badge bg-info">${addons.length} item(s)</span>
                            </div>
                        </div>
                        <div class="card-body">
                            <div class="table-responsive">
                                <table class="table table-bordered table-hover">
                                    <thead class="table-light">
                                        <tr>
                                            <th style="width: 5%">#</th>
                                            <th style="width: 25%">Item / Addon</th>
                                            <th style="width: 12%">Type</th>
                                            <th style="width: 10%" class="text-center">Qty</th>
                                            <th style="width: 10%" class="text-end">Price</th>
                                            <th style="width: 10%" class="text-end">Tax</th>
                                            <th style="width: 10%" class="text-end">Discount</th>
                                            <th style="width: 10%" class="text-end">Total</th>
                                        </tr>
                                    </thead>
                                    <tbody>
                                        ${addons.length > 0 ? addons.map((item, index) => {
                                            const itemName = item.product?.name ||
                                                item.sales_item?.name_primary || item.sales_item?.name ||
                                                item.sale_item?.name_primary || item.sale_item?.name ||
                                                item.description || 'Item';
                                            const uom = item.uom?.name || '';
                                            const itemType = item.item_type === 'product' ? 'Product' : 'Sales Item';
                                            return `
                                                <tr>
                                                    <td class="text-center">${index + 1}</td>
                                                    <td>
                                                        <strong>${itemName}</strong>
                                                        ${item.description && item.description !== itemName ? `<br><small class="text-muted">${item.description}</small>` : ''}
                                                    </td>
                                                    <td>
                                                        <span class="badge bg-${item.item_type === 'product' ? 'secondary' : 'info'}">${itemType}</span>
                                                    </td>
                                                    <td class="text-center">${parseFloat(item.quantity)} ${uom}</td>
                                                    <td class="text-end">${currency} ${parseFloat(item.unit_price).toFixed(2)}</td>
                                                    <td class="text-end">${currency} ${parseFloat(item.tax_amount || 0).toFixed(2)}</td>
                                                    <td class="text-end">${parseFloat(item.discount_amount || 0) > 0 ? currency + ' ' + parseFloat(item.discount_amount).toFixed(2) : '-'}</td>
                                                    <td class="text-end"><strong>${currency} ${parseFloat(item.total_amount).toFixed(2)}</strong></td>
                                                </tr>
                                            `;
                                        }).join('') : `
                                            <tr>
                                                <td colspan="8" class="text-center text-muted py-3">No addons added</td>
                                            </tr>
                                        `}
                                    </tbody>
                                </table>
                            </div>
                        </div>
                    </div>

                    <!-- Summary Card -->
                    <div class="card mb-4">
                        <div class="card-header">
                            <h5 class="mb-0">Invoice Summary</h5>
                        </div>
                        <div class="card-body">
                            <div class="row justify-content-end">
                                <div class="col-md-5">
                                    <table class="table table-borderless">
                                        <tbody>
                                            <tr>
                                                <td class="text-end"><strong>Subtotal:</strong></td>
                                                <td class="text-end" style="width: 150px;">${currency} ${parseFloat(invoice.subtotal).toFixed(2)}</td>
                                            </tr>
                                            <tr>
                                                <td class="text-end"><strong>Total Tax:</strong></td>
                                                <td class="text-end">${currency} ${parseFloat(invoice.total_tax || 0).toFixed(2)}</td>
                                            </tr>
                                            ${parseFloat(invoice.discount_amount || 0) > 0 ? `
                                            <tr>
                                                <td class="text-end"><strong>Discount:</strong></td>
                                                <td class="text-end text-danger">-${currency} ${parseFloat(invoice.discount_amount).toFixed(2)}</td>
                                            </tr>
                                            ` : ''}
                                            ${parseFloat(invoice.shipping_charges || 0) > 0 ? `
                                            <tr>
                                                <td class="text-end"><strong>Shipping Charges:</strong></td>
                                                <td class="text-end">${currency} ${parseFloat(invoice.shipping_charges).toFixed(2)}</td>
                                            </tr>
                                            ` : ''}
                                            ${parseFloat(invoice.other_charges || 0) > 0 ? `
                                            <tr>
                                                <td class="text-end"><strong>Other Charges:</strong></td>
                                                <td class="text-end">${currency} ${parseFloat(invoice.other_charges).toFixed(2)}</td>
                                            </tr>
                                            ` : ''}
                                            <tr class="table-primary">
                                                <td class="text-end"><strong class="fs-5">Grand Total:</strong></td>
                                                <td class="text-end"><strong class="fs-5 text-primary">${currency} ${parseFloat(invoice.total_amount).toFixed(2)}</strong></td>
                                            </tr>
                                            ${parseFloat(invoice.paid_amount || 0) > 0 ? `
                                            <tr>
                                                <td class="text-end"><strong>Amount Paid:</strong></td>
                                                <td class="text-end text-success">${currency} ${parseFloat(invoice.paid_amount).toFixed(2)}</td>
                                            </tr>
                                            <tr class="table-warning">
                                                <td class="text-end"><strong>Balance Due:</strong></td>
                                                <td class="text-end text-danger"><strong>${currency} ${parseFloat(invoice.balance_amount || 0).toFixed(2)}</strong></td>
                                            </tr>
                                            ` : ''}
                                        </tbody>
                                    </table>
                                </div>
                            </div>
                        </div>
                    </div>

                    <!-- Payment History Card -->
                    ${invoice.payments && invoice.payments.length > 0 ? `
                    <div class="card mb-4">
                        <div class="card-header bg-success text-white">
                            <h5 class="mb-0"><i class="bi bi-cash-stack me-2"></i>Payment History</h5>
                        </div>
                        <div class="card-body">
                            <div class="table-responsive">
                                <table class="table table-bordered table-hover">
                                    <thead class="table-light">
                                        <tr>
                                            <th>#</th>
                                            <th>Payment Date</th>
                                            <th>Payment Mode</th>
                                            <th class="text-end">Amount</th>
                                            <th>Reference</th>
                                            <th>Created By</th>
                                        </tr>
                                    </thead>
                                    <tbody>
                                        ${invoice.payments.map((payment, index) => `
                                            <tr>
                                                <td>${index + 1}</td>
                                                <td>${moment(payment.payment_date).format('DD/MM/YYYY')}</td>
                                                <td>${payment.payment_mode?.name || payment.paymentMode?.name || '-'}</td>
                                                <td class="text-end text-success"><strong>${currency} ${parseFloat(payment.amount).toFixed(2)}</strong></td>
                                                <td>${payment.reference_number || '-'}</td>
                                                <td>${payment.creator?.name || '-'}</td>
                                            </tr>
                                        `).join('')}
                                    </tbody>
                                </table>
                            </div>
                        </div>
                    </div>
                    ` : ''}

                    <!-- Additional Information Card -->
                    ${invoice.notes || invoice.terms_conditions ? `
                    <div class="card mb-4">
                        <div class="card-header">
                            <h5 class="mb-0">Additional Information</h5>
                        </div>
                        <div class="card-body">
                            ${invoice.notes ? `
                            <div class="mb-3">
                                <strong>Notes:</strong><br>
                                <p class="text-muted">${invoice.notes}</p>
                            </div>
                            ` : ''}
                            ${invoice.terms_conditions ? `
                            <div>
                                <strong>Terms & Conditions:</strong><br>
                                <p class="text-muted">${invoice.terms_conditions}</p>
                            </div>
                            ` : ''}
                        </div>
                    </div>
                    ` : ''}

                    <!-- Audit Information -->
                    <div class="card mb-4">
                        <div class="card-header">
                            <h5 class="mb-0">Audit Information</h5>
                        </div>
                        <div class="card-body">
                            <div class="row">
                                <div class="col-md-3">
                                    <strong>Created By:</strong><br>
                                    ${invoice.creator?.name || '-'}
                                </div>
                                <div class="col-md-3">
                                    <strong>Created At:</strong><br>
                                    ${invoice.created_at ? moment(invoice.created_at).format('DD/MM/YYYY HH:mm:ss') : '-'}
                                </div>
                                <div class="col-md-3">
                                    <strong>Last Updated:</strong><br>
                                    ${invoice.updated_at ? moment(invoice.updated_at).format('DD/MM/YYYY HH:mm:ss') : '-'}
                                </div>
                                <div class="col-md-3">
                                    <strong>Posted At:</strong><br>
                                    ${invoice.posted_at ? moment(invoice.posted_at).format('DD/MM/YYYY HH:mm:ss') : '-'}
                                </div>
                            </div>
                        </div>
                    </div>
                </div>
            `;
            $('#page-container').html(html);
        },

        getPaymentStatusBadge: function (status) {
            const statusMap = {
                'UNPAID': 'danger',
                'PARTIAL': 'warning',
                'PAID': 'success',
                'OVERDUE': 'danger',
                'CANCELLED': 'secondary'
            };
            const badgeClass = statusMap[status] || 'secondary';
            return `<span class="badge bg-${badgeClass} fs-6">${status}</span>`;
        },

        getStatusBadge: function (status) {
            const statusMap = {
                'DRAFT': 'secondary',
                'POSTED': 'primary',
                'CANCELLED': 'danger'
            };
            const badgeClass = statusMap[status] || 'secondary';
            return `<span class="badge bg-${badgeClass} fs-6">${status}</span>`;
        },

        printInvoice: function (id) {
            const templeId = TempleAPI.getTempleId ? TempleAPI.getTempleId() : 'temple';
            window.open(`/${templeId}/sales/invoices/print/${id}`, '_blank');
        },

        editInvoice: function (id) {
            TempleRouter.navigate('sales/invoices/edit', { id: id });
        },

        recordPayment: function (id) {
            TempleRouter.navigate('sales/invoices/payment', { id: id });
        }
    };
})(jQuery, window);