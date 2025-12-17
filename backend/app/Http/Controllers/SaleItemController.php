<?php

namespace App\Http\Controllers\API;

use App\Http\Controllers\Controller;
use App\Models\SaleItem;
use App\Models\SaleItemBomProduct;
use App\Models\SaleItemCommission;
use App\Models\Product;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Validator;
use Exception;

class SaleItemController extends Controller
{
    /**
     * Display a listing of sale items
     */
    public function index(Request $request)
    {
        try {
            $query = SaleItem::with(['categories', 'sessions', 'deities', 'ledger']);

            // Filter by status
            if ($request->has('status')) {
                $query->where('status', $request->boolean('status'));
            }

            // Filter by sale type
            if ($request->has('sale_type')) {
                $query->where('sale_type', $request->sale_type);
            }

            // Filter by category
            if ($request->has('category_id')) {
                $query->whereHas('categories', function($q) use ($request) {
                    $q->where('sale_category_id', $request->category_id);
                });
            }

            // Search filter
            if ($request->has('search')) {
                $search = $request->search;
                $query->where(function ($q) use ($search) {
                    $q->where('name_primary', 'ILIKE', "%{$search}%")
                      ->orWhere('name_secondary', 'ILIKE', "%{$search}%")
                      ->orWhere('short_code', 'ILIKE', "%{$search}%");
                });
            }

            // Order by
            $query->orderBy('name_primary', 'asc');

            $items = $query->get();

            return response()->json([
                'success' => true,
                'data' => $items
            ]);
        } catch (Exception $e) {
            return response()->json([
                'success' => false,
                'message' => 'Failed to fetch sale items',
                'error' => $e->getMessage()
            ], 500);
        }
    }

    /**
     * Get all active sale items
     */
    public function active()
    {
        try {
            $items = SaleItem::active()
                ->with(['categories', 'sessions', 'deities', 'ledger'])
                ->orderBy('name_primary', 'asc')
                ->get();

            return response()->json([
                'success' => true,
                'data' => $items
            ]);
        } catch (Exception $e) {
            return response()->json([
                'success' => false,
                'message' => 'Failed to fetch active sale items',
                'error' => $e->getMessage()
            ], 500);
        }
    }

    /**
     * Store a newly created sale item
     */
    public function store(Request $request)
    {
        $validator = Validator::make($request->all(), [
            'name_primary' => 'required|string|max:255',
            'name_secondary' => 'nullable|string|max:255',
            'description' => 'nullable|string',
            'short_code' => 'required|string|max:50|unique:sale_items,short_code',
            'ledger_id' => 'nullable|exists:ledgers,id',
            'sale_type' => 'required|in:General,Vehicle,Token,Special',
            'price' => 'required|numeric|min:0',
            'special_price' => 'nullable|numeric|min:0',
            'image_url' => 'nullable|string|max:500',
            'grayscale_image_url' => 'nullable|string|max:500',
            'status' => 'boolean',
            'is_inventory' => 'boolean',
            'is_commission' => 'boolean',
            'categories' => 'nullable|array',
            'categories.*' => 'exists:sale_categories,id',
            'sessions' => 'nullable|array',
            'sessions.*' => 'exists:sale_sessions,id',
            'deities' => 'nullable|array',
            'deities.*' => 'exists:deities,id',
            'bom_products' => 'nullable|array',
            'bom_products.*.product_id' => 'required|exists:products,id',
            'bom_products.*.quantity' => 'required|numeric|min:0.001',
            'commissions' => 'nullable|array',
            'commissions.*.staff_id' => 'required|exists:staff,id',
            'commissions.*.commission_percent' => 'required|numeric|min:0|max:100',
        ]);

        if ($validator->fails()) {
            return response()->json([
                'success' => false,
                'message' => 'Validation failed',
                'errors' => $validator->errors()
            ], 422);
        }

        // Validate total commission doesn't exceed 100%
        if ($request->has('commissions') && $request->is_commission) {
            $totalCommission = collect($request->commissions)->sum('commission_percent');
            if ($totalCommission > 100) {
                return response()->json([
                    'success' => false,
                    'message' => 'Total commission cannot exceed 100%',
                    'errors' => ['commissions' => ["Total commission is {$totalCommission}%. Maximum allowed is 100%."]]
                ], 422);
            }
        }

        try {
            DB::beginTransaction();

            // Create sale item
            $item = SaleItem::create([
                'name_primary' => $request->name_primary,
                'name_secondary' => $request->name_secondary,
                'description' => $request->description,
                'short_code' => strtoupper($request->short_code),
                'ledger_id' => $request->ledger_id,
                'sale_type' => $request->sale_type,
                'price' => $request->price,
                'special_price' => $request->special_price,
                'image_url' => $request->image_url,
                'grayscale_image_url' => $request->grayscale_image_url,
                'status' => $request->boolean('status', true),
                'is_inventory' => $request->boolean('is_inventory', false),
                'is_commission' => $request->boolean('is_commission', false),
                'created_by' => $request->user()->id ?? null,
            ]);

            // Attach categories
            if ($request->has('categories')) {
                $item->categories()->sync($request->categories);
            }

            // Attach sessions
            if ($request->has('sessions')) {
                $item->sessions()->sync($request->sessions);
            }

            // Attach deities
            if ($request->has('deities')) {
                $item->deities()->sync($request->deities);
            }

            // Add BOM products
            if ($request->has('bom_products') && $request->is_inventory) {
                foreach ($request->bom_products as $bomProduct) {
                    SaleItemBomProduct::create([
                        'sale_item_id' => $item->id,
                        'product_id' => $bomProduct['product_id'],
                        'quantity' => $bomProduct['quantity'],
                    ]);
                }
            }

            // Add commissions
            if ($request->has('commissions') && $request->is_commission) {
                foreach ($request->commissions as $commission) {
                    SaleItemCommission::create([
                        'sale_item_id' => $item->id,
                        'staff_id' => $commission['staff_id'],
                        'commission_percent' => $commission['commission_percent'],
                    ]);
                }
            }

            DB::commit();

            // Load relationships
            $item->load(['categories', 'sessions', 'deities', 'ledger', 'bomProducts.product', 'commissions.staff']);

            return response()->json([
                'success' => true,
                'message' => 'Sale item created successfully',
                'data' => $item
            ], 201);
        } catch (Exception $e) {
            DB::rollBack();
            return response()->json([
                'success' => false,
                'message' => 'Failed to create sale item',
                'error' => $e->getMessage()
            ], 500);
        }
    }

    /**
     * Display the specified sale item
     */
    public function show($id)
    {
        try {
            $item = SaleItem::with([
                'categories',
                'sessions',
                'deities',
                'ledger',
                'bomProducts.product.uom',
                'commissions.staff'
            ])->findOrFail($id);

            return response()->json([
                'success' => true,
                'data' => $item
            ]);
        } catch (Exception $e) {
            return response()->json([
                'success' => false,
                'message' => 'Sale item not found',
                'error' => $e->getMessage()
            ], 404);
        }
    }

    /**
     * Update the specified sale item
     */
    public function update(Request $request, $id)
    {
        $validator = Validator::make($request->all(), [
            'name_primary' => 'required|string|max:255',
            'name_secondary' => 'nullable|string|max:255',
            'description' => 'nullable|string',
            'short_code' => 'required|string|max:50|unique:sale_items,short_code,' . $id,
            'ledger_id' => 'nullable|exists:ledgers,id',
            'sale_type' => 'required|in:General,Vehicle,Token,Special',
            'price' => 'required|numeric|min:0',
            'special_price' => 'nullable|numeric|min:0',
            'image_url' => 'nullable|string|max:500',
            'grayscale_image_url' => 'nullable|string|max:500',
            'status' => 'boolean',
            'is_inventory' => 'boolean',
            'is_commission' => 'boolean',
            'categories' => 'nullable|array',
            'categories.*' => 'exists:sale_categories,id',
            'sessions' => 'nullable|array',
            'sessions.*' => 'exists:sale_sessions,id',
            'deities' => 'nullable|array',
            'deities.*' => 'exists:deities,id',
            'bom_products' => 'nullable|array',
            'bom_products.*.product_id' => 'required|exists:products,id',
            'bom_products.*.quantity' => 'required|numeric|min:0.001',
            'commissions' => 'nullable|array',
            'commissions.*.staff_id' => 'required|exists:staff,id',
            'commissions.*.commission_percent' => 'required|numeric|min:0|max:100',
        ]);

        if ($validator->fails()) {
            return response()->json([
                'success' => false,
                'message' => 'Validation failed',
                'errors' => $validator->errors()
            ], 422);
        }

        // Validate total commission doesn't exceed 100%
        if ($request->has('commissions') && $request->is_commission) {
            $totalCommission = collect($request->commissions)->sum('commission_percent');
            if ($totalCommission > 100) {
                return response()->json([
                    'success' => false,
                    'message' => 'Total commission cannot exceed 100%',
                    'errors' => ['commissions' => ["Total commission is {$totalCommission}%. Maximum allowed is 100%."]]
                ], 422);
            }
        }

        try {
            DB::beginTransaction();

            $item = SaleItem::findOrFail($id);
            $item->update([
                'name_primary' => $request->name_primary,
                'name_secondary' => $request->name_secondary,
                'description' => $request->description,
                'short_code' => strtoupper($request->short_code),
                'ledger_id' => $request->ledger_id,
                'sale_type' => $request->sale_type,
                'price' => $request->price,
                'special_price' => $request->special_price,
                'image_url' => $request->image_url,
                'grayscale_image_url' => $request->grayscale_image_url,
                'status' => $request->boolean('status', true),
                'is_inventory' => $request->boolean('is_inventory', false),
                'is_commission' => $request->boolean('is_commission', false),
                'updated_by' => $request->user()->id ?? null,
            ]);

            // Sync categories
            if ($request->has('categories')) {
                $item->categories()->sync($request->categories);
            } else {
                $item->categories()->detach();
            }

            // Sync sessions
            if ($request->has('sessions')) {
                $item->sessions()->sync($request->sessions);
            } else {
                $item->sessions()->detach();
            }

            // Sync deities
            if ($request->has('deities')) {
                $item->deities()->sync($request->deities);
            } else {
                $item->deities()->detach();
            }

            // Update BOM products
            $item->bomProducts()->delete();
            if ($request->has('bom_products') && $request->is_inventory) {
                foreach ($request->bom_products as $bomProduct) {
                    SaleItemBomProduct::create([
                        'sale_item_id' => $item->id,
                        'product_id' => $bomProduct['product_id'],
                        'quantity' => $bomProduct['quantity'],
                    ]);
                }
            }

            // Update commissions
            $item->commissions()->delete();
            if ($request->has('commissions') && $request->is_commission) {
                foreach ($request->commissions as $commission) {
                    SaleItemCommission::create([
                        'sale_item_id' => $item->id,
                        'staff_id' => $commission['staff_id'],
                        'commission_percent' => $commission['commission_percent'],
                    ]);
                }
            }

            DB::commit();

            // Load relationships
            $item->load(['categories', 'sessions', 'deities', 'ledger', 'bomProducts.product', 'commissions.staff']);

            return response()->json([
                'success' => true,
                'message' => 'Sale item updated successfully',
                'data' => $item
            ]);
        } catch (Exception $e) {
            DB::rollBack();
            return response()->json([
                'success' => false,
                'message' => 'Failed to update sale item',
                'error' => $e->getMessage()
            ], 500);
        }
    }

    /**
     * Remove the specified sale item
     */
    public function destroy($id)
    {
        try {
            DB::beginTransaction();

            $item = SaleItem::findOrFail($id);
            
            // Delete related records (cascading)
            $item->categories()->detach();
            $item->sessions()->detach();
            $item->deities()->detach();
            $item->bomProducts()->delete();
            $item->commissions()->delete();
            
            $item->delete();

            DB::commit();

            return response()->json([
                'success' => true,
                'message' => 'Sale item deleted successfully'
            ]);
        } catch (Exception $e) {
            DB::rollBack();
            return response()->json([
                'success' => false,
                'message' => 'Failed to delete sale item',
                'error' => $e->getMessage()
            ], 500);
        }
    }

    /**
     * Get available products for BOM
     */
    public function getAvailableProducts(Request $request)
    {
        try {
            $query = DB::table('products as p')
                ->leftJoin('uoms as u', 'p.uom_id', '=', 'u.id')
                ->leftJoin('uoms as base_u', 'u.base_unit', '=', 'base_u.id')
                ->leftJoin('item_categories as c', 'p.category_id', '=', 'c.id')
                ->select(
                    'p.id',
                    'p.product_code',
                    'p.name',
                    'p.product_type',
                    'p.average_cost',
                    'p.unit_price',
                    'p.available_stock',
                    'p.current_stock',
                    'p.low_stock_alert',
                    'p.image_url',
                    'p.uom_id',
                    'u.name as uom_name',
                    'u.uom_short',
                    'u.base_unit',
                    'u.conversion_factor',
                    'base_u.id as base_uom_id',
                    'base_u.name as base_uom_name',
                    'base_u.uom_short as base_uom_short',
                    'c.category_name as category_name'
                )
                ->where('p.is_active', true)
                ->where('p.current_stock', '>', 0)
                ->orderBy('p.name');

            // Filter by product type if specified
            if ($request->has('product_type')) {
                $query->where('p.product_type', $request->product_type);
            }

            // Search filter
            if ($request->has('search')) {
                $search = $request->search;
                $query->where(function ($q) use ($search) {
                    $q->where('p.name', 'ILIKE', "%{$search}%")
                        ->orWhere('p.product_code', 'ILIKE', "%{$search}%");
                });
            }

            $products = $query->get();

            return response()->json([
                'success' => true,
                'data' => $products
            ]);
        } catch (Exception $e) {
            return response()->json([
                'success' => false,
                'message' => 'Failed to fetch products',
                'error' => $e->getMessage()
            ], 500);
        }
    }
}