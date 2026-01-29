// js/pages/sales/orders/view.js
// Sales Order View Page
(function ($, window) {
    'use strict';

    window.SalesOrdersViewPage = {
        init: function (params) {
            this.id = params.id;
            this.loadData();
        },

        loadData: function () {
            TempleAPI.get(`/sales/orders/${this.id}`).done((response) => {
                if (response.success) {
                    this.render(response.data);
                }
            }).fail(() => {
                TempleCore.showToast('Failed to load order', 'error');
                TempleRouter.navigate('sales/orders');
            });
        },

        render: function (so) {
            const html = `
                <div class="container-fluid">
                    <div class="d-flex justify-content-between align-items-center mb-4">
                        <h3>View Sales Order: ${so.so_number}</h3>
                        <div>
                             <button class="btn btn-secondary" onclick="window.history.back()">Back</button>
                             <button class="btn btn-info" onclick="SalesOrdersViewPage.printSO('${so.id}')"><i class="bi bi-printer"></i> Print</button>
                             ${so.status === 'DRAFT' ? `
                                <button class="btn btn-success" onclick="SalesOrdersViewPage.approveSO('${so.id}')">Approve</button>
                                <button class="btn btn-danger" onclick="SalesOrdersViewPage.rejectSO('${so.id}')">Reject</button>
                             ` : ''}
                        </div>
                    </div>

                    <div class="card mb-4">
                        <div class="card-header">Order Details</div>
                        <div class="card-body">
                            <div class="row">
                                <div class="col-md-3"><strong>Date:</strong> ${moment(so.so_date).format('DD/MM/YYYY')}</div>
                                <div class="col-md-3"><strong>Status:</strong> ${so.status}</div>
                                <div class="col-md-3"><strong>Customer:</strong> ${so.devotee?.customer_name || '-'}</div>
                                <div class="col-md-3"><strong>Quotation Ref:</strong> ${so.quotation_ref || '-'}</div>
                            </div>
                            <div class="row mt-2">
                                <div class="col-md-6"><strong>Delivery Address:</strong> ${so.delivery_address || '-'}</div>
                                <div class="col-md-3"><strong>Delivery Date:</strong> ${so.delivery_date ? moment(so.delivery_date).format('DD/MM/YYYY') : '-'}</div>
                            </div>
                        </div>
                    </div>

                    <div class="card">
                         <div class="card-header">Items</div>
                         <div class="card-body">
                            <table class="table table-bordered">
                                <thead>
                                    <tr>
                                        <th>Description</th>
                                        <th>Qty</th>
                                        <th>Price</th>
                                        <th>Tax</th>
                                        <th>Discount</th>
                                        <th>Total</th>
                                    </tr>
                                </thead>
                                <tbody>
                                    ${so.items.map(item => `
                                        <tr>
                                            <td>${item.description || (item.product ? item.product.name : item.sale_item ? item.sale_item.name_primary : '-')}
                                                ${item.is_addon ? '<span class="badge bg-info">Addon</span>' : ''}
                                            </td>
                                            <td>${item.quantity} ${item.uom ? item.uom.name : ''}</td>
                                            <td>${parseFloat(item.unit_price).toFixed(2)}</td>
                                            <td>${parseFloat(item.tax_amount).toFixed(2)}</td>
                                            <td>${parseFloat(item.discount_amount).toFixed(2)}</td>
                                            <td>${parseFloat(item.total_amount).toFixed(2)}</td>
                                        </tr>
                                    `).join('')}
                                </tbody>
                                <tfoot>
                                    <tr>
                                        <td colspan="5" class="text-end"><strong>Subtotal:</strong></td>
                                        <td>${parseFloat(so.subtotal).toFixed(2)}</td>
                                    </tr>
                                     <tr>
                                        <td colspan="5" class="text-end"><strong>Tax:</strong></td>
                                        <td>${parseFloat(so.total_tax).toFixed(2)}</td>
                                    </tr>
                                     <tr>
                                        <td colspan="5" class="text-end"><strong>Discount:</strong></td>
                                        <td>${parseFloat(so.discount_amount).toFixed(2)}</td>
                                    </tr>
                                     <tr>
                                        <td colspan="5" class="text-end"><strong>Total:</strong></td>
                                        <td><strong>${parseFloat(so.total_amount).toFixed(2)}</strong></td>
                                    </tr>
                                </tfoot>
                            </table>
                         </div>
                    </div>
                </div>
            `;
            $('#page-container').html(html);
        },

        printSO: function (id) {
            const templeId = TempleAPI.getTempleId ? TempleAPI.getTempleId() : 'temple';
            window.open(`/${templeId}/sales/orders/print/${id}`, '_blank');
        },

        approveSO: function (id) {
            if (confirm("Are you sure?")) {
                TempleAPI.post(`/sales/orders/${id}/approve`)
                    .done((res) => { if (res.success) this.loadData(); });
            }
        },

        rejectSO: function (id) {
            const reason = prompt("Enter rejection reason:");
            if (reason) {
                TempleAPI.post(`/sales/orders/${id}/reject`, { rejection_reason: reason })
                    .done((res) => { if (res.success) this.loadData(); });
            }
        },
    };
})(jQuery, window);
