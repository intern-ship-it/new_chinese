// js/pages/manufacturing/bom/create.js
// Create BOM Page

(function ($, window) {
    'use strict';

    window.ManufacturingBomCreatePage = {
        bomDetails: [],
        detailCounter: 0,
        products: [],
        rawMaterials: [],
        uoms: [],

        init: function (params) {
            this.render();
            this.loadInitialData();
            this.bindEvents();
        },

        render: function () {
            const html = `
                <div class="container-fluid">
                    <div class="row mb-4">
                        <div class="col-md-6">
                            <h4 class="fw-bold">Create Bill of Materials</h4>
                            <nav aria-label="breadcrumb">
                                <ol class="breadcrumb">
                                    <li class="breadcrumb-item"><a href="#" onclick="TempleRouter.navigate('dashboard'); return false;">Dashboard</a></li>
                                    <li class="breadcrumb-item"><a href="#" onclick="TempleRouter.navigate('manufacturing/bom'); return false;">BOM</a></li>
                                    <li class="breadcrumb-item active">Create</li>
                                </ol>
                            </nav>
                        </div>
                    </div>
                    
                    <form id="bomForm">
                        <div class="card mb-3">
                            <div class="card-header">
                                <h5 class="mb-0">BOM Information</h5>
                            </div>
                            <div class="card-body">
                                <div class="row g-3">
                                    <div class="col-md-6">
                                        <label class="form-label">BOM Name <span class="text-danger">*</span></label>
                                        <input type="text" class="form-control" id="bomName" required>
                                    </div>
                                    <div class="col-md-6">
                                        <label class="form-label">Product to Manufacture <span class="text-danger">*</span></label>
                                        <select class="form-select" id="productId" required>
                                            <option value="">Select Product</option>
                                        </select>
                                    </div>
                                    <div class="col-md-3">
                                        <label class="form-label">Output Quantity <span class="text-danger">*</span></label>
                                        <input type="number" class="form-control" id="outputQuantity" step="0.001" min="0.001" value="1" required>
                                    </div>
                                    <div class="col-md-3">
                                        <label class="form-label">Output UOM <span class="text-danger">*</span></label>
                                        <select class="form-select" id="outputUomId" required>
                                            <option value="">Select UOM</option>
                                        </select>
                                    </div>
                                    <div class="col-md-3">
                                        <label class="form-label">Labor Cost</label>
                                        <input type="number" class="form-control" id="laborCost" step="0.01" min="0" value="0">
                                    </div>
                                    <div class="col-md-3">
                                        <label class="form-label">Overhead Cost</label>
                                        <input type="number" class="form-control" id="overheadCost" step="0.01" min="0" value="0">
                                    </div>
                                    <div class="col-md-6">
                                        <label class="form-label">Effective From</label>
                                        <input type="date" class="form-control" id="effectiveFrom">
                                    </div>
                                    <div class="col-md-6">
                                        <label class="form-label">Effective To</label>
                                        <input type="date" class="form-control" id="effectiveTo">
                                    </div>
                                    <div class="col-md-12">
                                        <label class="form-label">Description</label>
                                        <textarea class="form-control" id="description" rows="2"></textarea>
                                    </div>
                                </div>
                            </div>
                        </div>
                        
                        <div class="card mb-3">
                            <div class="card-header d-flex justify-content-between align-items-center">
                                <h5 class="mb-0">Raw Materials</h5>
                                <button type="button" class="btn btn-primary btn-sm" id="addRawMaterialBtn">
                                    <i class="bi bi-plus-circle"></i> Add Raw Material
                                </button>
                            </div>
                            <div class="card-body">
                                <div class="table-responsive">
                                    <table class="table table-bordered">
                                        <thead>
                                            <tr>
                                                <th width="30%">Raw Material</th>
                                                <th width="15%">Quantity</th>
                                                <th width="15%">UOM</th>
                                                <th width="15%">Unit Cost</th>
                                                <th width="15%">Total Cost</th>
                                                <th width="10%">Actions</th>
                                            </tr>
                                        </thead>
                                        <tbody id="rawMaterialsTableBody">
                                            <tr id="noRawMaterialsRow">
                                                <td colspan="6" class="text-center text-muted">No raw materials added. Click "Add Raw Material" to begin.</td>
                                            </tr>
                                        </tbody>
                                        <tfoot>
                                            <tr>
                                                <th colspan="4" class="text-end">Total Material Cost:</th>
                                                <th id="totalMaterialCost">0.00</th>
                                                <th></th>
                                            </tr>
                                        </tfoot>
                                    </table>
                                </div>
                            </div>
                        </div>
                        
                        <div class="card">
                            <div class="card-body">
                                <h5>Cost Summary</h5>
                                <table class="table table-sm" style="max-width: 400px;">
                                    <tr>
                                        <td>Material Cost:</td>
                                        <td class="text-end" id="summaryMaterialCost">0.00</td>
                                    </tr>
                                    <tr>
                                        <td>Labor Cost:</td>
                                        <td class="text-end" id="summaryLaborCost">0.00</td>
                                    </tr>
                                    <tr>
                                        <td>Overhead Cost:</td>
                                        <td class="text-end" id="summaryOverheadCost">0.00</td>
                                    </tr>
                                    <tr class="fw-bold">
                                        <td>Total Cost:</td>
                                        <td class="text-end" id="summaryTotalCost">0.00</td>
                                    </tr>
                                    <tr>
                                        <td>Unit Cost:</td>
                                        <td class="text-end" id="summaryUnitCost">0.00</td>
                                    </tr>
                                </table>
                            </div>
                        </div>
                        
                        <div class="row mt-3">
                            <div class="col-12">
                                <button type="button" class="btn btn-secondary" onclick="TempleRouter.navigate('manufacturing/bom'); return false;">
                                    <i class="bi bi-arrow-left"></i> Back to List
                                </button>
                                <button type="submit" class="btn btn-primary">
                                    <i class="bi bi-save"></i> Save as Draft
                                </button>
                                <button type="button" class="btn btn-success" id="saveAndApproveBtn">
                                    <i class="bi bi-check-circle"></i> Save & Approve
                                </button>
                            </div>
                        </div>
                    </form>
                </div>
            `;

            $('#page-container').html(html);
        },

        loadInitialData: function () {
            const self = this;

            // Load manufacturable products
            TempleAPI.get('/manufacturing/bom/manufacturable-products')
                .done(function (response) {
                    if (response.success) {
                        self.products = response.data;
                        let options = '<option value="">Select Product</option>';
                        response.data.forEach(function (product) {
                            options += `<option value="${product.id}">${product.product_code} - ${product.name}</option>`;
                        });
                        $('#productId').html(options);
                    }
                });

            // Load raw materials
            TempleAPI.get('/manufacturing/bom/raw-materials')
                .done(function (response) {
                    if (response.success) {
                        self.rawMaterials = response.data;
                    }
                });

            // Load UOMs
            TempleAPI.get('/inventory/uom')
                .done(function (response) {
                    if (response.success && response.data) {
                        self.uoms = response.data.data || response.data;
                        self.populateUomSelects(); // for output UOM only
                    }
                });
        },

        // Output UOM select (global)
        populateUomSelects: function () {
            let uomOptions = '<option value="">Select UOM</option>';
            this.uoms.forEach(function (uom) {
                uomOptions += `<option value="${uom.id}" data-base="${uom.base_unit || ''}" data-factor="${uom.conversion_factor || 1}">
                    ${uom.name} (${uom.uom_short})
                </option>`;
            });
            $('#outputUomId').html(uomOptions);
        },

        // ---- UOM helpers ----

        // get UOM object by id
        getUomById: function (id) {
            id = String(id);
            return this.uoms.find(u => String(u.id) === id) || null;
        },

        // build a Set of related UOM ids: the chosen UOM, all its ancestors, and all descendants
        getRelatedUomIds: function (uomId) {
            if (!uomId) return new Set();
            const idStr = String(uomId);

            // index uoms by id and map parent->children
            const byId = new Map(this.uoms.map(u => [String(u.id), u]));
            const childrenMap = new Map(); // base_unit_id -> [children...]
            this.uoms.forEach(u => {
                const parent = (u.base_unit == null || u.base_unit === '') ? null : String(u.base_unit);
                if (!childrenMap.has(parent)) childrenMap.set(parent, []);
                childrenMap.get(parent).push(u);
            });

            const related = new Set();

            // up-chain (parents)
            let cur = byId.get(idStr);
            while (cur) {
                related.add(String(cur.id));
                const parentId = (cur.base_unit == null || cur.base_unit === '') ? null : String(cur.base_unit);
                cur = parentId ? byId.get(parentId) : null;
            }

            // down-chain (descendants) BFS
            const queue = [byId.get(idStr)];
            while (queue.length) {
                const node = queue.shift();
                if (!node) continue;
                const kids = childrenMap.get(String(node.id)) || [];
                for (const k of kids) {
                    const kidId = String(k.id);
                    if (!related.has(kidId)) {
                        related.add(kidId);
                        queue.push(k);
                    }
                }
            }

            return related;
        },

        // build HTML <option> list for a subset of UOM ids
        buildUomOptionsForIds: function (allowedIds, selectedId) {
            let opts = '<option value="">Select UOM</option>';
            this.uoms.forEach(u => {
                const idStr = String(u.id);
                if (allowedIds.has(idStr)) {
                    const sel = String(selectedId) === idStr ? 'selected' : '';
                    opts += `<option value="${u.id}" ${sel} data-factor="${u.conversion_factor || 1}" data-base="${u.base_unit || ''}">
                        ${u.uom_short || u.name}
                    </option>`;
                }
            });
            return opts;
        },

        // relative factor (assumes conversion_factor is vs the group's base/root)
        // cost_selected = cost_base * (factor_base / factor_selected)
        getRelativeFactor: function (fromUomId, toUomId) {
            const from = this.getUomById(fromUomId);
            const to = this.getUomById(toUomId);
            const fFrom = from && from.conversion_factor ? Number(from.conversion_factor) : 1;
            const fTo = to && to.conversion_factor ? Number(to.conversion_factor) : 1;
            if (fTo === 0) return 1;
            return fFrom / fTo;
        },

        bindEvents: function () {
            const self = this;

            // Add raw material button
            $('#addRawMaterialBtn').on('click', function () {
                self.addRawMaterialRow();
            });

            // Labor and overhead cost change
            $('#laborCost, #overheadCost').on('input', function () {
                self.updateCostSummary();
            });

            // Output quantity change
            $('#outputQuantity').on('input', function () {
                self.updateCostSummary();
            });

            // Form submit (Save as Draft)
            $('#bomForm').on('submit', function (e) {
                e.preventDefault();
                self.saveBom('DRAFT');
            });

            // Save and Approve button
            $('#saveAndApproveBtn').on('click', function () {
                if (self.validateForm()) {
                    self.saveBom('ACTIVE');
                }
            });
        },

        addRawMaterialRow: function () {
            const self = this;
            const rowId = 'detail_' + (++this.detailCounter);

            // Hide no materials row
            $('#noRawMaterialsRow').hide();

            // Get already selected material IDs
            const selectedMaterialIds = this.bomDetails
                .filter(d => d.raw_material_id)
                .map(d => d.raw_material_id);

            // Create raw material options (excluding already selected ones)
            let rawMaterialOptions = '<option value="">Select Raw Material</option>';
            this.rawMaterials.forEach(function (material) {
                // Skip if material is already selected in another row
                if (selectedMaterialIds.includes(material.id.toString())) {
                    return;
                }
                
                const cost = material.unit_price || 0;
                rawMaterialOptions += `
                    <option value="${material.id}" 
                            data-cost="${cost}" 
                            data-uom="${material.uom_id}">
                        ${material.product_code} - ${material.name}
                    </option>`;
            });

            // UOM select is disabled & empty until a material is chosen
            const html = `
                <tr id="${rowId}">
                    <td>
                        <select class="form-select raw-material-select" data-row="${rowId}" required>
                            ${rawMaterialOptions}
                        </select>
                    </td>
                    <td>
                        <input type="number" class="form-control quantity-input" data-row="${rowId}" 
                               step="0.001" min="0.001" value="1" required>
                    </td>
                    <td>
                        <select class="form-select uom-select" data-row="${rowId}" required disabled>
                            <option value="">Select UOM</option>
                        </select>
                    </td>
                    <td>
                        <input type="number" class="form-control unit-cost-input" data-row="${rowId}" 
                               step="0.01" min="0" value="0" readonly>
                    </td>
                    <td>
                        <input type="number" class="form-control total-cost-input" data-row="${rowId}" 
                               step="0.01" min="0" value="0" readonly>
                    </td>
                    <td>
                        <button type="button" class="btn btn-sm btn-danger remove-row-btn" data-row="${rowId}">
                            <i class="bi bi-trash"></i>
                        </button>
                    </td>
                </tr>
            `;

            $('#rawMaterialsTableBody').append(html);

            // Add to details array
            this.bomDetails.push({
                id: rowId,
                raw_material_id: null,
                quantity: 1,
                uom_id: null,
                unit_cost: 0,
                total_cost: 0,
                base_uom_id: null,     // NEW: material's default/base UOM
                base_unit_cost: 0      // NEW: cost per base UOM
            });

            // Bind events for new row
            this.bindRowEvents(rowId);
        },

        bindRowEvents: function (rowId) {
            const self = this;

            // Raw material selection change
            $(`.raw-material-select[data-row="${rowId}"]`).on('change', function () {
                const $option = $(this).find('option:selected');
                const cost = parseFloat($option.data('cost')) || 0;        
                const uomId = $option.data('uom');                          

                const $uomSel = $(`.uom-select[data-row="${rowId}"]`);

                // Populate UOM family and pre-select base UOM
                const relatedIds = uomId ? self.getRelatedUomIds(String(uomId)) : new Set();
                const uomHtml = self.buildUomOptionsForIds(relatedIds, uomId);
                $uomSel.html(uomHtml).prop('disabled', false);             

                // Get conversion factor of the selected (base) UOM
                const selectedOption = $uomSel.find('option:selected');
                const conversionFactor = parseFloat(selectedOption.attr('data-factor')) || 1;

                // Store base cost and calculate unit cost
                const detail = self.bomDetails.find(d => d.id === rowId);
                if (detail) {
                    detail.raw_material_id = $(this).val();
                    detail.base_uom_id = uomId || null;                  
                    detail.base_unit_cost = cost;                          
                    detail.uom_id = selectedOption.val();                 
                    detail.unit_cost = cost * conversionFactor;            

                    $(`.unit-cost-input[data-row="${rowId}"]`).val(detail.unit_cost.toFixed(2));
                }

                // Refresh all other dropdowns to exclude newly selected material
                self.refreshMaterialDropdowns();

                // Calculate total
                self.calculateRowTotal(rowId);
            });

            // Quantity change
            $(`.quantity-input[data-row="${rowId}"]`).on('input', function () {
                const detail = self.bomDetails.find(d => d.id === rowId);
                if (detail) {
                    detail.quantity = parseFloat($(this).val()) || 0;
                }
                self.calculateRowTotal(rowId);
            });

            // UOM change (convert unit cost from base to selected)
            $(`.uom-select[data-row="${rowId}"]`).on('change', function () {
                const selectedUomId = $(this).val();
                const $uomSel = $(`.uom-select[data-row="${rowId}"]`);
                const selectedOption = $uomSel.find('option:selected');
                const conversionFactor = parseFloat(selectedOption.attr('data-factor')) || 1;
                const detail = self.bomDetails.find(d => d.id === rowId);
                if (detail) {
                    detail.uom_id = selectedUomId;

                    if (detail.base_uom_id && detail.base_unit_cost != null) {
                        // multiply by conversion_factor
                        const convertedCost = detail.base_unit_cost * (conversionFactor || 1);

                        detail.unit_cost = convertedCost;
                        $(`.unit-cost-input[data-row="${rowId}"]`).val(convertedCost.toFixed(2));
                    }
                }
                self.calculateRowTotal(rowId);
            });

            // Remove row button
            $(`.remove-row-btn[data-row="${rowId}"]`).on('click', function () {
                self.removeRow(rowId);
            });
        },

        refreshMaterialDropdowns: function () {
            const self = this;
            
            // Get all selected material IDs
            const selectedMaterialIds = this.bomDetails
                .filter(d => d.raw_material_id)
                .map(d => d.raw_material_id.toString());

            // Update each dropdown
            this.bomDetails.forEach(function (detail) {
                const $select = $(`.raw-material-select[data-row="${detail.id}"]`);
                const currentValue = $select.val();
                
                // Rebuild options
                let options = '<option value="">Select Raw Material</option>';
                self.rawMaterials.forEach(function (material) {
                    const materialId = material.id.toString();
                    
                    // Include current selection or materials not selected elsewhere
                    if (materialId === currentValue || !selectedMaterialIds.includes(materialId)) {
                        const cost = material.unit_price || 0;
                        const selected = materialId === currentValue ? 'selected' : '';
                        options += `
                            <option value="${material.id}" 
                                    data-cost="${cost}" 
                                    data-uom="${material.uom_id}"
                                    ${selected}>
                                ${material.product_code} - ${material.name}
                            </option>`;
                    }
                });
                
                $select.html(options);
            });
        },

        calculateRowTotal: function (rowId) {
            const quantity = parseFloat($(`.quantity-input[data-row="${rowId}"]`).val()) || 0;
            const unitCost = parseFloat($(`.unit-cost-input[data-row="${rowId}"]`).val()) || 0;
            const totalCost = quantity * unitCost;

            $(`.total-cost-input[data-row="${rowId}"]`).val(totalCost.toFixed(2));

            // Update detail object
            const detail = this.bomDetails.find(d => d.id === rowId);
            if (detail) {
                detail.total_cost = totalCost;
            }

            this.updateTotalMaterialCost();
        },

        removeRow: function (rowId) {
            $(`#${rowId}`).remove();

            // Remove from details array
            this.bomDetails = this.bomDetails.filter(d => d.id !== rowId);

            // Show no materials row if empty
            if (this.bomDetails.length === 0) {
                $('#noRawMaterialsRow').show();
            }

            // Refresh all dropdowns to make the removed material available again
            this.refreshMaterialDropdowns();

            this.updateTotalMaterialCost();
        },

        updateTotalMaterialCost: function () {
            let total = 0;
            this.bomDetails.forEach(function (detail) {
                total += detail.total_cost || 0;
            });

            $('#totalMaterialCost').text(TempleCore.formatCurrency(total));
            $('#summaryMaterialCost').text(TempleCore.formatCurrency(total));

            this.updateCostSummary();
        },

        updateCostSummary: function () {
            const materialCost = this.bomDetails.reduce((sum, d) => sum + (d.total_cost || 0), 0);
            const laborCost = parseFloat($('#laborCost').val()) || 0;
            const overheadCost = parseFloat($('#overheadCost').val()) || 0;
            const totalCost = materialCost + laborCost + overheadCost;
            const outputQty = parseFloat($('#outputQuantity').val()) || 1;
            const unitCost = totalCost / outputQty;

            $('#summaryMaterialCost').text(TempleCore.formatCurrency(materialCost));
            $('#summaryLaborCost').text(TempleCore.formatCurrency(laborCost));
            $('#summaryOverheadCost').text(TempleCore.formatCurrency(overheadCost));
            $('#summaryTotalCost').text(TempleCore.formatCurrency(totalCost));
            $('#summaryUnitCost').text(TempleCore.formatCurrency(unitCost));
        },

        validateForm: function () {
            // Check required fields
            if (!$('#bomName').val()) {
                TempleCore.showToast('Please enter BOM name', 'warning');
                return false;
            }

            if (!$('#productId').val()) {
                TempleCore.showToast('Please select product to manufacture', 'warning');
                return false;
            }

            if (!$('#outputQuantity').val() || parseFloat($('#outputQuantity').val()) <= 0) {
                TempleCore.showToast('Please enter valid output quantity', 'warning');
                return false;
            }

            if (!$('#outputUomId').val()) {
                TempleCore.showToast('Please select output UOM', 'warning');
                return false;
            }

            // Check raw materials
            if (this.bomDetails.length === 0) {
                TempleCore.showToast('Please add at least one raw material', 'warning');
                return false;
            }

            // Check for duplicate raw materials
            const materialIds = [];
            for (let detail of this.bomDetails) {
                if (detail.raw_material_id && materialIds.includes(detail.raw_material_id)) {
                    TempleCore.showToast('Duplicate raw materials are not allowed. Each material can only be added once.', 'warning');
                    return false;
                }
                materialIds.push(detail.raw_material_id);
            }

            // Validate each raw material row
            for (let detail of this.bomDetails) {
                if (!detail.raw_material_id) {
                    TempleCore.showToast('Please select raw material for all rows', 'warning');
                    return false;
                }
                if (!detail.uom_id) {
                    TempleCore.showToast('Please select UOM for all raw materials', 'warning');
                    return false;
                }
                if (detail.quantity <= 0) {
                    TempleCore.showToast('Please enter valid quantity for all raw materials', 'warning');
                    return false;
                }
            }

            return true;
        },

        saveBom: function (status) {
            if (!this.validateForm()) {
                return;
            }

            const effectiveFrom = $('#effectiveFrom').val();
            const effectiveTo = $('#effectiveTo').val();

            if (effectiveTo && effectiveFrom && effectiveTo < effectiveFrom) {
                TempleCore.showToast('Effective To date must be after Effective From date', 'warning');
                return;
            }

            // Prepare data
            const bomData = {
                bom_name: $('#bomName').val(),
                product_id: $('#productId').val(),
                output_quantity: parseFloat($('#outputQuantity').val()),
                output_uom_id: $('#outputUomId').val(),
                labor_cost: parseFloat($('#laborCost').val()) || 0,
                overhead_cost: parseFloat($('#overheadCost').val()) || 0,
                effective_from: effectiveFrom || null,
                effective_to: effectiveTo || null,
                description: $('#description').val(),
                details: this.bomDetails.filter(d => d.raw_material_id).map((detail, index) => ({
                    raw_material_id: detail.raw_material_id,
                    quantity: detail.quantity,
                    uom_id: detail.uom_id,
                    sequence_no: (index + 1) * 10,
                    notes: ''
                }))
            };

            TempleCore.showLoading(true);

            TempleAPI.post('/manufacturing/bom', bomData)
                .done(function (response) {
                    if (response.success) {
                        // Always hide loading first
                        TempleCore.showLoading(false);

                        if (status === 'ACTIVE' && response.data && response.data.id) {
                            // Approve the BOM
                            TempleCore.showLoading(true);
                            TempleAPI.post('/manufacturing/bom/' + response.data.id + '/approve')
                                .done(function () {
                                    TempleCore.showToast('BOM created and approved successfully', 'success');
                                    setTimeout(function () {
                                        window.location.href = '/' + TempleAPI.getTempleId() + '/manufacturing/bom';
                                    }, 500);
                                })
                                .fail(function () {
                                    TempleCore.showToast('BOM created but approval failed', 'warning');
                                    setTimeout(function () {
                                        window.location.href = '/' + TempleAPI.getTempleId() + '/manufacturing/bom';
                                    }, 500);
                                })
                                .always(function () {
                                    TempleCore.showLoading(false);
                                });
                        } else {
                            TempleCore.showToast('BOM created successfully', 'success');
                            setTimeout(function () {
                                window.location.href = '/' + TempleAPI.getTempleId() + '/manufacturing/bom';
                            }, 500);
                        }
                    } else {
                        TempleCore.showLoading(false);
                        TempleCore.showToast(response.message || 'Failed to create BOM', 'error');
                    }
                })
                .fail(function (xhr) {
                    TempleCore.showLoading(false);
                    const response = xhr.responseJSON;
                    if (response && response.errors) {
                        const firstError = Object.values(response.errors)[0];
                        TempleCore.showToast(firstError[0] || 'Validation failed', 'error');
                    } else {
                        TempleCore.showToast(response?.message || 'Failed to create BOM', 'error');
                    }
                });
        }
    };

})(jQuery, window);