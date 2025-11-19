<?php
// app/Http/Controllers/BomController.php

namespace App\Http\Controllers;

use App\Models\BomMaster;
use App\Models\BomDetail;
use App\Models\Product;
use App\Models\ProductManufacturingSetting;
use App\Models\Uom;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Validator;
use Illuminate\Support\Facades\Log;
use Illuminate\Support\Facades\Auth;
use App\Models\User;


class BomController extends Controller
{
    /**
     * Get all BOMs with filtering
     */
    public function index(Request $request)
    {
        try {
            $query = BomMaster::with(['product', 'outputUom', 'creator', 'approver']);

            // Apply filters
            if ($request->status) {
                $query->where('status', $request->status);
            }

            if ($request->product_id) {
                $query->where('product_id', $request->product_id);
            }

            if ($request->search) {
                $search = $request->search;
                $query->where(function ($q) use ($search) {
                    $q->where('bom_code', 'LIKE', "%{$search}%")
                        ->orWhere('bom_name', 'LIKE', "%{$search}%")
                        ->orWhereHas('product', function ($q) use ($search) {
                            $q->where('name', 'LIKE', "%{$search}%");
                        });
                });
            }

            // Pagination
            $perPage = $request->per_page ?? 15;
            $boms = $query->orderBy('created_at', 'desc')->paginate($perPage);
            $user = Auth::user();
            $permissions = $this->assignPermissions($user);

            return response()->json([
                'success' => true,
                'data' => $boms,
                'permissions' => $permissions
            ]);
        } catch (\Exception $e) {
            return response()->json([
                'success' => false,
                'message' => 'Failed to fetch BOMs',
                'error' => $e->getMessage()
            ], 500);
        }
    }

    /**
     * Get single BOM with details
     */
    public function show($id)
    {
        $user = Auth::user();
        $permissions = $this->assignPermissions($user);
        try {
            $bom = BomMaster::with([
                'product',
                'outputUom',
                'details.rawMaterial',
                'details.uom',
                'creator',
                'updater',
                'approver'
            ])->findOrFail($id);

            // Calculate current costs
            foreach ($bom->details as $detail) {
                $detail->current_cost = $detail->rawMaterial->average_cost
                    ?? $detail->rawMaterial->last_purchase_cost
                    ?? $detail->rawMaterial->cost_price
                    ?? 0;
            }

            return response()->json([
                'success' => true,
                'data' => $bom,
                'permissions' => $permissions
            ]);
        } catch (\Exception $e) {
            return response()->json([
                'success' => false,
                'message' => 'BOM not found',
                'error' => $e->getMessage()
            ], 404);
        }
    }

    /**
     * Create new BOM
     */
    public function store(Request $request)
    {
        if (!Auth::user()->can('manufacturing.bom.create')) {
            return response()->json([
                'success' => false,
                'message' => 'You do not have permission to create manufacturing bom'
            ], 403);
        }
        $validator = Validator::make($request->all(), [
            'bom_name' => 'required|string|max:255',
            'product_id' => 'required|exists:products,id',
            'output_quantity' => 'required|numeric|min:0.001',
            'output_uom_id' => 'required|exists:uoms,id',
            'labor_cost' => 'nullable|numeric|min:0',
            'overhead_cost' => 'nullable|numeric|min:0',
            'effective_from' => 'nullable|date',
            'effective_to' => 'nullable|date|after_or_equal:effective_from',
            'description' => 'nullable|string',
            'notes' => 'nullable|string',
            'details' => 'required|array|min:1',
            'details.*.raw_material_id' => 'required|exists:products,id',
            'details.*.quantity' => 'required|numeric|min:0.001',
            'details.*.uom_id' => 'required|exists:uoms,id',
            'details.*.sequence_no' => 'nullable|integer|min:0',
            'details.*.notes' => 'nullable|string'
        ]);

        if ($validator->fails()) {
            return response()->json([
                'success' => false,
                'message' => 'Validation failed',
                'errors' => $validator->errors()
            ], 422);
        }

        // Check for duplicate raw materials
        $materialIds = array_column($request->details, 'raw_material_id');
        if (count($materialIds) !== count(array_unique($materialIds))) {
            return response()->json([
                'success' => false,
                'message' => 'Duplicate raw materials are not allowed. Each material can only be added once.'
            ], 422);
        }

        DB::beginTransaction();
        try {
            // Ensure product is marked as manufacturable
            ProductManufacturingSetting::firstOrCreate(
                ['product_id' => $request->product_id],
                [
                    'manufacturing_type' => 'MANUFACTURABLE',
                    'requires_quality_check' => false,
                    'track_batches' => false,
                    'is_active' => true,
                    'created_by' => auth()->id()
                ]
            );

            // Create BOM master
            $bomMaster = BomMaster::create([
                'bom_name' => $request->bom_name,
                'product_id' => $request->product_id,
                'description' => $request->description,
                'output_quantity' => $request->output_quantity,
                'output_uom_id' => $request->output_uom_id,
                'labor_cost' => $request->labor_cost ?? 0,
                'overhead_cost' => $request->overhead_cost ?? 0,
                'effective_from' => $request->effective_from,
                'effective_to' => $request->effective_to,
                'notes' => $request->notes,
                'status' => 'DRAFT',
                'created_by' => auth()->id(),
                'updated_by' => auth()->id()
            ]);

            $totalMaterialCost = 0;

            foreach ($request->details as $index => $detail) {
                $rawMaterial = Product::find($detail['raw_material_id']);
                $unitCost = $rawMaterial->unit_price ?? 0;

                // Get conversion factor from UOM (if available)
                $uom = Uom::find($detail['uom_id']);
                $conversionFactor = $uom ? $uom->conversion_factor : 1;

                // Adjust unit cost based on conversion factor
                $unitCost = (float)$unitCost * (float)$conversionFactor;
                $totalCost = (float)$unitCost * (float)$detail['quantity'];
                $totalMaterialCost += $totalCost;

                // Ensure raw material is marked correctly
                ProductManufacturingSetting::firstOrCreate(
                    ['product_id' => $detail['raw_material_id']],
                    [
                        'manufacturing_type' => 'RAW_MATERIAL',
                        'is_active' => true,
                        'created_by' => auth()->id()
                    ]
                );

                // Handle sequence number properly (same logic as update)
                if (isset($detail['sequence_no']) && $detail['sequence_no'] !== null && $detail['sequence_no'] !== '') {
                    $sequenceNo = (int)$detail['sequence_no'];
                } else {
                    $sequenceNo = ($index + 1) * 10;
                }

                // Save BOM detail
                BomDetail::create([
                    'bom_master_id' => $bomMaster->id,
                    'raw_material_id' => $detail['raw_material_id'],
                    'quantity' => (float)$detail['quantity'],
                    'uom_id' => $detail['uom_id'],
                    'unit_cost' => (float)$unitCost,
                    'total_cost' => (float)$totalCost,
                    'sequence_no' => $sequenceNo,
                    'notes' => $detail['notes'] ?? null
                ]);
            }

            // Update total cost (material + labor + overhead)
            $bomMaster->total_cost = $totalMaterialCost + ($bomMaster->labor_cost ?? 0) + ($bomMaster->overhead_cost ?? 0);
            $bomMaster->save();

            DB::commit();

            return response()->json([
                'success' => true,
                'message' => 'BOM created successfully',
                'data' => $bomMaster->load(['details.rawMaterial', 'details.uom'])
            ], 201);
        } catch (\Exception $e) {
            DB::rollBack();
            return response()->json([
                'success' => false,
                'message' => 'Failed to create BOM',
                'error' => $e->getMessage()
            ], 500);
        }
    }

    /**
     * Update BOM
     */
    public function update(Request $request, $id)
    {
        if (!Auth::user()->can('manufacturing.bom.edit')) {
            return response()->json([
                'success' => false,
                'message' => 'You do not have permission to edit manufacturing bom'
            ], 403);
        }
        $validator = Validator::make($request->all(), [
            'bom_name' => 'required|string|max:255',
            'product_id' => 'required|exists:products,id',
            'output_quantity' => 'required|numeric|min:0.001',
            'output_uom_id' => 'required|exists:uoms,id',
            'labor_cost' => 'nullable|numeric|min:0',
            'overhead_cost' => 'nullable|numeric|min:0',
            'effective_from' => 'nullable|date',
            'effective_to' => 'nullable|date|after_or_equal:effective_from',
            'description' => 'nullable|string',
            'notes' => 'nullable|string',
            'details' => 'required|array|min:1',
            'details.*.raw_material_id' => 'required|exists:products,id',
            'details.*.quantity' => 'required|numeric|min:0.001',
            'details.*.uom_id' => 'required|exists:uoms,id',
            'details.*.sequence_no' => 'nullable|integer|min:0',
            'details.*.notes' => 'nullable|string'
        ]);

        if ($validator->fails()) {
            return response()->json([
                'success' => false,
                'message' => 'Validation failed',
                'errors' => $validator->errors()
            ], 422);
        }

        // Check for duplicate raw materials
        $materialIds = array_column($request->details, 'raw_material_id');
        if (count($materialIds) !== count(array_unique($materialIds))) {
            return response()->json([
                'success' => false,
                'message' => 'Duplicate raw materials are not allowed. Each material can only be added once.'
            ], 422);
        }

        DB::beginTransaction();
        try {
            $bomMaster = BomMaster::findOrFail($id);

            // Prevent updates if BOM is active with manufacturing orders
            if ($bomMaster->status === 'ACTIVE' && $bomMaster->manufacturingOrders()->exists()) {
                return response()->json([
                    'success' => false,
                    'message' => 'Cannot update active BOM with existing manufacturing orders'
                ], 400);
            }

            // Ensure product is marked as manufacturable
            ProductManufacturingSetting::firstOrCreate(
                ['product_id' => $request->product_id],
                [
                    'manufacturing_type' => 'MANUFACTURABLE',
                    'requires_quality_check' => false,
                    'track_batches' => false,
                    'is_active' => true,
                    'created_by' => auth()->id()
                ]
            );

            // Update master
            $bomMaster->update([
                'bom_name' => $request->bom_name,
                'product_id' => $request->product_id,
                'description' => $request->description,
                'output_quantity' => $request->output_quantity,
                'output_uom_id' => $request->output_uom_id,
                'labor_cost' => $request->labor_cost ?? 0,
                'overhead_cost' => $request->overhead_cost ?? 0,
                'effective_from' => $request->effective_from,
                'effective_to' => $request->effective_to,
                'notes' => $request->notes,
                'updated_by' => auth()->id()
            ]);

            // Delete old details
            $bomMaster->details()->delete();

            $totalMaterialCost = 0;

            foreach ($request->details as $index => $detail) {
                $rawMaterial = Product::find($detail['raw_material_id']);
                $unitCost = $rawMaterial->unit_price ?? 0;

                // Get conversion factor from UOM
                $uom = Uom::find($detail['uom_id']);
                $conversionFactor = $uom ? $uom->conversion_factor : 1;

                // Adjust cost using conversion factor
                $unitCost = (float)$unitCost * (float)$conversionFactor;
                $totalCost = (float)$unitCost * (float)$detail['quantity'];
                $totalMaterialCost += $totalCost;

                // Ensure raw material is marked correctly
                ProductManufacturingSetting::firstOrCreate(
                    ['product_id' => $detail['raw_material_id']],
                    [
                        'manufacturing_type' => 'RAW_MATERIAL',
                        'is_active' => true,
                        'created_by' => auth()->id()
                    ]
                );

                // Handle sequence number
                if (isset($detail['sequence_no']) && $detail['sequence_no'] !== null && $detail['sequence_no'] !== '') {
                    $sequenceNo = (int)$detail['sequence_no'];
                } else {
                    $sequenceNo = ($index + 1) * 10;
                }

                BomDetail::create([
                    'bom_master_id' => $bomMaster->id,
                    'raw_material_id' => $detail['raw_material_id'],
                    'quantity' => (float)$detail['quantity'],
                    'uom_id' => $detail['uom_id'],
                    'unit_cost' => (float)$unitCost,
                    'total_cost' => (float)$totalCost,
                    'sequence_no' => $sequenceNo,
                    'notes' => $detail['notes'] ?? null
                ]);
            }

            // Update total cost (material + labor + overhead)
            $bomMaster->total_cost = $totalMaterialCost + ($bomMaster->labor_cost ?? 0) + ($bomMaster->overhead_cost ?? 0);
            $bomMaster->save();

            DB::commit();

            return response()->json([
                'success' => true,
                'message' => 'BOM updated successfully',
                'data' => $bomMaster->load(['details.rawMaterial', 'details.uom'])
            ]);
        } catch (\Exception $e) {
            DB::rollBack();
            return response()->json([
                'success' => false,
                'message' => 'Failed to update BOM',
                'error' => $e->getMessage()
            ], 500);
        }
    }

    /**
     * Delete BOM
     */
    public function destroy($id)
    {
        if (!Auth::user()->can('manufacturing.bom.delete')) {
            return response()->json([
                'success' => false,
                'message' => 'You do not have permission to delete manufacturing bom'
            ], 403);
        }
        DB::beginTransaction();
        try {
            $bomMaster = BomMaster::findOrFail($id);

            if (!$bomMaster->canBeDeleted()) {
                return response()->json([
                    'success' => false,
                    'message' => 'Cannot delete BOM with existing manufacturing orders'
                ], 400);
            }

            $bomMaster->delete();

            DB::commit();

            return response()->json([
                'success' => true,
                'message' => 'BOM deleted successfully'
            ]);
        } catch (\Exception $e) {
            DB::rollback();
            return response()->json([
                'success' => false,
                'message' => 'Failed to delete BOM',
                'error' => $e->getMessage()
            ], 500);
        }
    }

    /**
     * Approve BOM
     */
    public function approve($id)
    {
        try {
            $bomMaster = BomMaster::findOrFail($id);

            if ($bomMaster->status === 'ACTIVE') {
                return response()->json([
                    'success' => false,
                    'message' => 'BOM is already active'
                ], 400);
            }

            // Deactivate other BOMs for the same product
            BomMaster::where('product_id', $bomMaster->product_id)
                ->where('id', '!=', $id)
                ->where('status', 'ACTIVE')
                ->update(['status' => 'INACTIVE']);

            $bomMaster->approve(auth()->id());

            return response()->json([
                'success' => true,
                'message' => 'BOM approved successfully',
                'data' => $bomMaster
            ]);
        } catch (\Exception $e) {
            return response()->json([
                'success' => false,
                'message' => 'Failed to approve BOM',
                'error' => $e->getMessage()
            ], 500);
        }
    }

    /**
     * Duplicate BOM
     */
    public function duplicate(Request $request, $id)
    {
        $validator = Validator::make($request->all(), [
            'product_id' => 'nullable|exists:products,id'
        ]);

        if ($validator->fails()) {
            return response()->json([
                'success' => false,
                'message' => 'Validation failed',
                'errors' => $validator->errors()
            ], 422);
        }

        try {
            $bomMaster = BomMaster::findOrFail($id);
            $newBom = $bomMaster->duplicate($request->product_id);

            if (!$newBom) {
                throw new \Exception('Failed to duplicate BOM');
            }

            return response()->json([
                'success' => true,
                'message' => 'BOM duplicated successfully',
                'data' => $newBom->load(['details.rawMaterial', 'details.uom'])
            ], 201);
        } catch (\Exception $e) {
            return response()->json([
                'success' => false,
                'message' => 'Failed to duplicate BOM',
                'error' => $e->getMessage()
            ], 500);
        }
    }

    /**
     * Check raw material availability for BOM
     */
    public function checkAvailability(Request $request, $id)
    {
        $validator = Validator::make($request->all(), [
            'quantity_to_produce' => 'required|numeric|min:0.001',
            'warehouse_id' => 'required|exists:warehouses,id'
        ]);

        if ($validator->fails()) {
            return response()->json([
                'success' => false,
                'message' => 'Validation failed',
                'errors' => $validator->errors()
            ], 422);
        }

        try {
            $bomMaster = BomMaster::findOrFail($id);
            $availability = $bomMaster->checkRawMaterialAvailability(
                $request->quantity_to_produce,
                $request->warehouse_id
            );

            return response()->json([
                'success' => true,
                'data' => $availability
            ]);
        } catch (\Exception $e) {
            return response()->json([
                'success' => false,
                'message' => 'Failed to check availability',
                'error' => $e->getMessage()
            ], 500);
        }
    }

    /**
     * Get products that can be manufactured
     */
    public function getManufacturableProducts()
    {
        try {
            $products = Product::get();

            return response()->json([
                'success' => true,
                'data' => $products
            ]);
        } catch (\Exception $e) {
            return response()->json([
                'success' => false,
                'message' => 'Failed to fetch manufacturable products',
                'error' => $e->getMessage()
            ], 500);
        }
    }

    /**
     * Get products that can be used as raw materials
     */
    public function getRawMaterials()
    {
        try {
            // Get all products that can be used as raw materials or all products if not configured
            $products = Product::with(['uom'])
                ->where('is_active', true)
                ->select('id', 'product_code', 'name', 'uom_id', 'unit_price', 'average_cost', 'last_purchase_cost')
                ->get();

            return response()->json([
                'success' => true,
                'data' => $products
            ]);
        } catch (\Exception $e) {
            return response()->json([
                'success' => false,
                'message' => 'Failed to fetch raw materials',
                'error' => $e->getMessage()
            ], 500);
        }
    }

    /**
     * Update BOM costs from current product prices
     */
    public function updateCosts($id)
    {
        DB::beginTransaction();
        try {
            $bomMaster = BomMaster::findOrFail($id);

            $bomMaster->updateTotalCost();

            DB::commit();

            return response()->json([
                'success' => true,
                'message' => 'BOM costs updated successfully',
                'data' => $bomMaster->load(['details.rawMaterial', 'details.uom'])
            ]);
        } catch (\Exception $e) {
            DB::rollback();
            return response()->json([
                'success' => false,
                'message' => 'Failed to update BOM costs',
                'error' => $e->getMessage()
            ], 500);
        }
    }
    /**
     * Get permissions for a specific user by their ID.
     *
     * @param  int  $userId
     * @return \Illuminate\Http\Response
     */
    public function getUserPermissions($userId)
    {

        $user = User::find($userId);


        if (!$user) {
            return response()->json(['success' => false, 'message' => 'User not found'], 404);
        }


        $permissions = $this->assignPermissions($user);


        return response()->json([
            'success' => true,
            'data' => $permissions
        ]);
    }

    /**
     * Assign permissions based on user role.
     *
     * @param  User  $user
     * @return array
     */
    private function assignPermissions(User $user)
    {

        $user = Auth::user();
        $permissions = [
            'can_create_manufacturing_bom' => $user->can('manufacturing.bom.create'),
            'can_edit_manufacturing_bom' => $user->can('manufacturing.bom.edit'),
            'can_delete_manufacturing_bom' => $user->can('manufacturing.bom.delete'),
            'can_view_manufacturing_bom' => $user->can('manufacturing.bom.view'),
            'can_approve_manufacturing_bom' => $user->can('manufacturing.bom.approve'),
        ];
        return $permissions;
    }
}
