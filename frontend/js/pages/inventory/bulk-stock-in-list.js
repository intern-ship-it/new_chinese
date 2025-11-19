// js/pages/inventory/bulk-stock-in-list.js
window.InventoryBulkStockInListPage = {
    currentPage: 1,
    
    init: function() {
        this.setupPage();
        this.bindEvents();
        this.loadBulkStockInList();
    },
    
    setupPage: function() {
        const html = `
            <div class="container-fluid">
                <div class="row">
                    <div class="col-12">
                        <div class="card">
                            <div class="card-header bg-primary text-white d-flex justify-content-between align-items-center">
                                <h4 class="mb-0">
                                    <i class="bi bi-box-arrow-in-down-fill"></i> Bulk Stock In Records
                                </h4>
                                <button class="btn btn-light btn-sm" onclick="TempleRouter.navigate('inventory/bulk-stock-in')">
                                    <i class="bi bi-plus-circle"></i> New Bulk Stock In
                                </button>
                            </div>
                            <div class="card-body">
                                <!-- Filters -->
                                <div class="row mb-3">
                                    <div class="col-md-3">
                                        <input type="text" id="searchInput" class="form-control" 
                                               placeholder="Search by reference...">
                                    </div>
                                    <div class="col-md-2">
                                        <select id="warehouseFilter" class="form-control">
                                            <option value="">All Warehouses</option>
                                        </select>
                                    </div>
                                    <div class="col-md-2">
                                        <select id="typeFilter" class="form-control">
                                            <option value="">All Types</option>
                                            <option value="OPENING_STOCK">Opening Stock</option>
                                            <option value="PURCHASE">Purchase</option>
                                            <option value="DONATION_RECEIVED">Donation Received</option>
                                            <option value="ADJUSTMENT">Adjustment</option>
                                        </select>
                                    </div>
                                    <div class="col-md-2">
                                        <select id="statusFilter" class="form-control">
                                            <option value="">All Status</option>
                                            <option value="DRAFT">Draft</option>
                                            <option value="APPROVED">Approved</option>
                                        </select>
                                    </div>
                                    <div class="col-md-3">
                                        <button class="btn btn-primary" onclick="InventoryBulkStockInListPage.applyFilters()">
                                            <i class="bi bi-funnel"></i> Apply Filters
                                        </button>
                                        <button class="btn btn-secondary" onclick="InventoryBulkStockInListPage.resetFilters()">
                                            <i class="bi bi-arrow-clockwise"></i> Reset
                                        </button>
                                    </div>
                                </div>
                                
                                <!-- Table -->
                                <div class="table-responsive">
                                    <table class="table table-striped table-hover">
                                        <thead>
                                            <tr>
                                                <th>Reference Number</th>
                                                <th>Date</th>
                                                <th>Warehouse</th>
                                                <th>Type</th>
                                                <th>Items</th>
                                                <th>Total Quantity</th>
                                                <th>Total Value</th>
                                                <th>Status</th>
                                                <th>Created By</th>
                                                <th>Actions</th>
                                            </tr>
                                        </thead>
                                        <tbody id="bulkStockInTableBody">
                                            <tr>
                                                <td colspan="10" class="text-center">
                                                    <div class="spinner-border text-primary" role="status">
                                                        <span class="visually-hidden">Loading...</span>
                                                    </div>
                                                </td>
                                            </tr>
                                        </tbody>
                                    </table>
                                </div>
                                
                                <!-- Pagination -->
                                <div class="d-flex justify-content-between align-items-center mt-3">
                                    <div id="paginationInfo"></div>
                                    <div id="paginationControls"></div>
                                </div>
                            </div>
                        </div>
                    </div>
                </div>
            </div>
            
            <!-- View Details Modal -->
            <div class="modal fade" id="viewDetailsModal" tabindex="-1">
                <div class="modal-dialog modal-xl">
                    <div class="modal-content">
                        <div class="modal-header">
                            <h5 class="modal-title">Bulk Stock In Details</h5>
                            <button type="button" class="btn-close" data-bs-dismiss="modal"></button>
                        </div>
                        <div class="modal-body" id="modalDetailsContent">
                            <!-- Content will be loaded dynamically -->
                        </div>
                        <div class="modal-footer">
                            <button type="button" class="btn btn-secondary" data-bs-dismiss="modal">Close</button>
                        </div>
                    </div>
                </div>
            </div>
        `;
        
        $('#page-container').html(html);
        
        // Load warehouses for filter
        this.loadWarehousesForFilter();
    },
    
    bindEvents: function() {
        // Search on enter
        $('#searchInput').on('keypress', function(e) {
            if (e.which === 13) {
                InventoryBulkStockInListPage.applyFilters();
            }
        });
    },
    
    loadWarehousesForFilter: function() {
        TempleAPI.get('/inventory/warehouse').done(function(response) {
            if (response.success) {
                let options = '<option value="">All Warehouses</option>';
                response.data.forEach(function(warehouse) {
                    options += `<option value="${warehouse.id}">${warehouse.name}</option>`;
                });
                $('#warehouseFilter').html(options);
            }
        });
    },
    
    loadBulkStockInList: function(page = 1) {
        const filters = {
            page: page,
            per_page: 20,
            search: $('#searchInput').val(),
            warehouse_id: $('#warehouseFilter').val(),
            movement_subtype: $('#typeFilter').val(),
            approval_status: $('#statusFilter').val()
        };
        
        TempleAPI.get('/inventory/stock-in/bulk-list', filters)
            .done(function(response) {
                if (response.success) {
                    InventoryBulkStockInListPage.renderTable(response.data);
                    InventoryBulkStockInListPage.renderPagination(response.data.pagination);
                }
            })
            .fail(function() {
                $('#bulkStockInTableBody').html(
                    '<tr><td colspan="10" class="text-center text-danger">Failed to load data</td></tr>'
                );
            });
    },
    
    renderTable: function(data) {
        const tbody = $('#bulkStockInTableBody');
        tbody.empty();
        
        if (!data.items || data.items.length === 0) {
            tbody.html('<tr><td colspan="10" class="text-center text-muted">No records found</td></tr>');
            return;
        }
        
        data.items.forEach(function(item) {
            const statusBadge = item.approval_status === 'DRAFT' 
                ? '<span class="badge bg-warning">Draft</span>'
                : '<span class="badge bg-success">Approved</span>';
            
            const actions = `
                <div class="btn-group btn-group-sm" role="group">
                    <button class="btn btn-info" onclick="InventoryBulkStockInListPage.viewDetails('${item.reference_number}')" 
                            title="View Details">
                        <i class="bi bi-eye"></i>
                    </button>
                    ${item.can_edit ? `
                        <button class="btn btn-warning" onclick="InventoryBulkStockInListPage.editBulkStockIn('${item.reference_number}')" 
                                title="Edit">
                            <i class="bi bi-pencil"></i>
                        </button>
                    ` : ''}
                    ${item.can_delete ? `
                        <button class="btn btn-danger" onclick="InventoryBulkStockInListPage.deleteBulkStockIn('${item.reference_number}')" 
                                title="Delete">
                            <i class="bi bi-trash"></i>
                        </button>
                    ` : ''}
                </div>
            `;
            
            const row = `
                <tr>
                    <td><code>${item.reference_number}</code></td>
                    <td>${new Date(item.created_at).toLocaleDateString()}</td>
                    <td>${item.warehouse.name}</td>
                    <td>${item.movement_subtype_label}</td>
                    <td class="text-center">${item.item_count}</td>
                    <td class="text-right">${parseFloat(item.total_quantity).toFixed(3)}</td>
                    <td class="text-right">${parseFloat(item.total_value).toFixed(2)}</td>
                    <td>${statusBadge}</td>
                    <td>${item.created_by || '-'}</td>
                    <td>${actions}</td>
                </tr>
            `;
            tbody.append(row);
        });
    },
    
    renderPagination: function(pagination) {
        // Pagination info
        $('#paginationInfo').html(
            `Showing ${pagination.from || 0} to ${pagination.to || 0} of ${pagination.total} entries`
        );
        
        // Pagination controls
        let controls = '<nav><ul class="pagination mb-0">';
        
        // Previous button
        controls += `
            <li class="page-item ${pagination.current_page === 1 ? 'disabled' : ''}">
                <a class="page-link" href="#" onclick="InventoryBulkStockInListPage.loadBulkStockInList(${pagination.current_page - 1}); return false;">
                    Previous
                </a>
            </li>
        `;
        
        // Page numbers
        for (let i = 1; i <= pagination.last_page; i++) {
            if (i === 1 || i === pagination.last_page || 
                (i >= pagination.current_page - 2 && i <= pagination.current_page + 2)) {
                controls += `
                    <li class="page-item ${i === pagination.current_page ? 'active' : ''}">
                        <a class="page-link" href="#" onclick="InventoryBulkStockInListPage.loadBulkStockInList(${i}); return false;">
                            ${i}
                        </a>
                    </li>
                `;
            } else if (i === pagination.current_page - 3 || i === pagination.current_page + 3) {
                controls += '<li class="page-item disabled"><a class="page-link">...</a></li>';
            }
        }
        
        // Next button
        controls += `
            <li class="page-item ${pagination.current_page === pagination.last_page ? 'disabled' : ''}">
                <a class="page-link" href="#" onclick="InventoryBulkStockInListPage.loadBulkStockInList(${pagination.current_page + 1}); return false;">
                    Next
                </a>
            </li>
        `;
        
        controls += '</ul></nav>';
        $('#paginationControls').html(controls);
    },
    
    applyFilters: function() {
        this.loadBulkStockInList(1);
    },
    
    resetFilters: function() {
        $('#searchInput').val('');
        $('#warehouseFilter').val('');
        $('#typeFilter').val('');
        $('#statusFilter').val('');
        this.loadBulkStockInList(1);
    },
    
    viewDetails: function(referenceNumber) {
        TempleAPI.get('/inventory/stock-in/bulk/' + referenceNumber)
            .done(function(response) {
                if (response.success) {
                    const data = response.data;
                    let itemsHtml = '';
                    
                    data.items.forEach(function(item, index) {
                        itemsHtml += `
                            <tr>
                                <td>${index + 1}</td>
                                <td>${item.product_name}<br><small class="text-muted">${item.product_code}</small></td>
                                <td>${item.quantity} ${item.uom || ''}</td>
                                <td>${item.unit_cost}</td>
                                <td>${item.total_cost}</td>
                                <td>${item.batch_number || '-'}</td>
                                <td>${item.expiry_date ? new Date(item.expiry_date).toLocaleDateString() : '-'}</td>
                                <td>${item.notes || '-'}</td>
                            </tr>
                        `;
                    });
                    
                    const content = `
                        <div class="row mb-3">
                            <div class="col-md-6">
                                <strong>Reference:</strong> ${data.reference_number}<br>
                                <strong>Warehouse:</strong> ${data.warehouse_name}<br>
                                <strong>Type:</strong> ${data.movement_subtype}
                            </div>
                            <div class="col-md-6">
                                <strong>Created By:</strong> ${data.created_by || '-'}<br>
                                <strong>Created At:</strong> ${new Date(data.created_at).toLocaleString()}<br>
                                <strong>Status:</strong> ${data.approval_status}
                            </div>
                        </div>
                        <div class="table-responsive">
                            <table class="table table-bordered">
                                <thead>
                                    <tr>
                                        <th>#</th>
                                        <th>Product</th>
                                        <th>Quantity</th>
                                        <th>Unit Cost</th>
                                        <th>Total</th>
                                        <th>Batch</th>
                                        <th>Expiry</th>
                                        <th>Notes</th>
                                    </tr>
                                </thead>
                                <tbody>
                                    ${itemsHtml}
                                </tbody>
                            </table>
                        </div>
                    `;
                    
                    $('#modalDetailsContent').html(content);
                    const modal = new bootstrap.Modal(document.getElementById('viewDetailsModal'));
                    modal.show();
                }
            });
    },
    
    editBulkStockIn: function(referenceNumber) {
        TempleRouter.navigate('inventory/bulk-stock-in', { mode: 'edit', id: referenceNumber });
    },
    
    deleteBulkStockIn: function(referenceNumber) {
        TempleCore.showConfirm(
            'Delete Bulk Stock In',
            'Are you sure you want to delete this bulk stock in record? This action cannot be undone.',
            function() {
                TempleAPI.delete('/inventory/stock-in/bulk/' + referenceNumber)
                    .done(function(response) {
                        if (response.success) {
                            TempleCore.showToast('Bulk stock in deleted successfully', 'success');
                            InventoryBulkStockInListPage.loadBulkStockInList();
                        }
                    })
                    .fail(function(xhr) {
                        const response = xhr.responseJSON;
                        TempleCore.showToast(response?.message || 'Failed to delete', 'error');
                    });
            }
        );
    }
};