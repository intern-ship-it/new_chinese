<?php
// app/Http/Controllers/ProductController.php

namespace App\Http\Controllers;

use App\Models\Product;
use App\Models\Ledger;
use App\Models\Uom;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Validator;
use Illuminate\Support\Facades\Auth;

class ProductController extends Controller
{
    public function index(Request $request)
    {
        try {
            $query = Product::with(['category', 'uom', 'ledger']);

            // Apply filters
            if ($request->has('category_id')) {
                $query->where('category_id', $request->category_id);
            }

            if ($request->has('is_active')) {
                $query->where('is_active', $request->is_active);
            }

            if ($request->has('is_stockable')) {
                $query->where('is_stockable', $request->is_stockable);
            }

            if ($request->has('search')) {
                $search = $request->search;
                $query->where(function ($q) use ($search) {
                    $q->where('name', 'ILIKE', "%{$search}%")
                        ->orWhere('product_code', 'ILIKE', "%{$search}%")
                        ->orWhere('description', 'ILIKE', "%{$search}%");
                });
            }

            // Check for low stock - FIXED VERSION
            if ($request->has('low_stock') && $request->low_stock) {
                $query->where('is_stockable', true)
                    ->where(function ($q) {
                        // Check if stock is below alert threshold
                        $q->whereRaw('low_stock_alert > 0 AND current_stock <= low_stock_alert')
                            // OR if low_stock_alert is not set but stock is at/below min_stock
                            ->orWhereRaw('(low_stock_alert = 0 OR low_stock_alert IS NULL) AND min_stock > 0 AND current_stock <= min_stock');
                    });
            }

            $products = $query->orderBy('name')->paginate($request->per_page ?? 50);
            // Get user permissions
            $user = Auth::user();

            $permissions = [
                'can_create_product' => $user->can('products.create'),
                'can_edit_product' => $user->can('products.edit'),
                'can_delete_product' => $user->can('products.delete'),
                'can_view_product' => $user->can('products.view'),
            ];

            return response()->json([
                'success' => true,
                'data' => $products,
                'permissions' => $permissions
            ]);
        } catch (\Exception $e) {
            return response()->json([
                'success' => false,
                'message' => 'Error fetching products: ' . $e->getMessage()
            ], 500);
        }
    }
    public function store(Request $request)
    {
        if (!Auth::user()->can('products.create')) {
            return response()->json([
                'success' => false,
                'message' => 'You do not have permission to create products'
            ], 403);
        }
        $validator = Validator::make($request->all(), [
            'name' => 'required|string|max:255',
            'description' => 'nullable|string',
            'category_id' => 'nullable|exists:item_categories,id',
            'ledger_id' => 'nullable|exists:ledgers,id',
            'uom_id' => 'nullable|exists:uoms,id',
            'unit_price' => 'required|numeric|min:0',
            'cost_price' => 'nullable|numeric|min:0',
            'current_stock' => 'nullable|numeric|min:0',
            'min_stock' => 'nullable|numeric|min:0',
            'is_stockable' => 'boolean',
            'is_active' => 'boolean',
            'low_stock_alert' => 'nullable|numeric|min:0',
            'hsn_code' => 'nullable|string|max:50',
            'specifications' => 'nullable|array',
            'product_type' => 'nullable|in:PRODUCT,RAW_MATERIAL,BOTH',

        ]);

        if ($validator->fails()) {
            return response()->json([
                'success' => false,
                'errors' => $validator->errors()
            ], 422);
        }

        DB::beginTransaction();
        try {
            $data = $request->all();
            $data['available_stock'] = $request->current_stock;
            $data['created_by'] = Auth::id();
            $data['updated_by'] = Auth::id();

            // Generate product code automatically
            $data['product_code'] = $this->generateProductCode($data['category_id'] ?? null);

            // Use product_code as barcode
            $data['barcode'] = $data['product_code'];

            $product = Product::create($data);

            DB::commit();

            return response()->json([
                'success' => true,
                'message' => 'Product created successfully',
                'data' => $product->load(['category', 'uom', 'ledger'])
            ], 201);
        } catch (\Exception $e) {
            DB::rollback();
            return response()->json([
                'success' => false,
                'message' => 'Error creating product: ' . $e->getMessage()
            ], 500);
        }
    }

    public function show($id)
    {
        try {


            $product = Product::with(['category', 'uom', 'ledger', 'createdBy', 'updatedBy'])
                ->findOrFail($id);
            $user = Auth::user();
            $permissions = [
                'can_edit_product' => $user->can('products.edit'),
                'can_delete_product' => $user->can('products.delete'),
            ];

            return response()->json([
                'success' => true,
                'data' => $product,
                'permissions' => $permissions
            ]);
        } catch (\Exception $e) {
            return response()->json([
                'success' => false,
                'message' => 'Product not found'
            ], 404);
        }
    }

    public function update(Request $request, $id)
    {
        if (!Auth::user()->can('products.edit')) {
            return response()->json([
                'success' => false,
                'message' => 'You do not have permission to edit products'
            ], 403);
        }
        $validator = Validator::make($request->all(), [
            'name' => 'required|string|max:255',
            'description' => 'nullable|string',
            'category_id' => 'nullable|exists:item_categories,id',
            'ledger_id' => 'nullable|exists:ledgers,id',
            'uom_id' => 'nullable|exists:uoms,id',
            'unit_price' => 'required|numeric|min:0',
            'cost_price' => 'nullable|numeric|min:0',
            'min_stock' => 'nullable|numeric|min:0',
            'is_stockable' => 'boolean',
            'is_active' => 'boolean',
            'low_stock_alert' => 'nullable|numeric|min:0',
            'hsn_code' => 'nullable|string|max:50',
            'specifications' => 'nullable|array',
            'product_type' => 'nullable|in:PRODUCT,RAW_MATERIAL,BOTH',

        ]);

        if ($validator->fails()) {
            return response()->json([
                'success' => false,
                'errors' => $validator->errors()
            ], 422);
        }

        DB::beginTransaction();
        try {
            $product = Product::findOrFail($id);

            $data = $request->all();
            $data['updated_by'] = Auth::id();

            // Remove product_code and barcode from update data to prevent changes
            unset($data['product_code']);
            unset($data['barcode']);
            // Don't update current_stock directly through product update
            unset($data['current_stock']);

            $product->update($data);

            DB::commit();

            return response()->json([
                'success' => true,
                'message' => 'Product updated successfully',
                'data' => $product->load(['category', 'uom', 'ledger'])
            ]);
        } catch (\Exception $e) {
            DB::rollback();
            return response()->json([
                'success' => false,
                'message' => 'Error updating product: ' . $e->getMessage()
            ], 500);
        }
    }

    public function destroy($id)
    {
        if (!Auth::user()->can('products.delete')) {
            return response()->json([
                'success' => false,
                'message' => 'You do not have permission to delete products'
            ], 403);
        }

        DB::beginTransaction();
        try {
            $product = Product::findOrFail($id);

            // Check if product is used in any transactions
            // Add your business logic here

            $product->delete();

            DB::commit();

            return response()->json([
                'success' => true,
                'message' => 'Product deleted successfully'
            ]);
        } catch (\Exception $e) {
            DB::rollback();
            return response()->json([
                'success' => false,
                'message' => 'Error deleting product: ' . $e->getMessage()
            ], 500);
        }
    }

    public function toggleStatus($id)
    {
        try {
            $product = Product::findOrFail($id);
            $product->is_active = !$product->is_active;
            $product->updated_by = Auth::id();
            $product->save();

            return response()->json([
                'success' => true,
                'message' => 'Product status updated successfully',
                'data' => $product
            ]);
        } catch (\Exception $e) {
            return response()->json([
                'success' => false,
                'message' => 'Error updating status'
            ], 500);
        }
    }

    public function getLowStockProducts()
    {
        try {
            $products = Product::with(['category', 'uom', 'ledger'])
                ->where('is_stockable', true)
                ->where('low_stock_alert', '>', 0)
                ->whereRaw('current_stock <= low_stock_alert')
                ->where('is_active', true)
                ->get();

            return response()->json([
                'success' => true,
                'data' => $products
            ]);
        } catch (\Exception $e) {
            return response()->json([
                'success' => false,
                'message' => 'Error fetching low stock products'
            ], 500);
        }
    }

    // Get ledgers for product dropdown
    public function getLedgers()
    {

        try {
            // Get inventory ledgers (where iv = 1)
            $ledgers = Ledger::where('iv', 1)
                ->orderBy('name')
                ->get(['id', 'name', 'left_code', 'right_code']);

            return response()->json([
                'success' => true,
                'data' => $ledgers
            ]);
        } catch (\Exception $e) {
            return response()->json([
                'success' => false,
                'message' => 'Error fetching ledgers'
            ], 500);
        }
    }

    private function generateProductCode($categoryId = null)
    {
        $prefix = 'PRD';

        // Get the last product with this prefix, ordered properly
        $lastProduct = Product::where('product_code', 'LIKE', $prefix . '%')
            ->orderByRaw('LENGTH(product_code) DESC')
            ->orderBy('product_code', 'desc')
            ->first();

        if ($lastProduct) {
            // Extract the numeric part more reliably
            $code = $lastProduct->product_code;
            // Remove the prefix to get the number part
            $numericPart = substr($code, strlen($prefix));
            // Convert to integer and increment
            $lastNumber = intval($numericPart);
            $newNumber = $lastNumber + 1;
        } else {
            $newNumber = 1;
        }

        // Generate new code with 8-digit padding
        $newCode = $prefix . str_pad($newNumber, 8, '0', STR_PAD_LEFT);

        // Double-check that this code doesn't exist (in case of race conditions)
        while (Product::where('product_code', $newCode)->exists()) {
            $newNumber++;
            $newCode = $prefix . str_pad($newNumber, 8, '0', STR_PAD_LEFT);
        }

        return $newCode;
    }
    public function printBarcode($id)
    {
        try {
            $product = Product::findOrFail($id);

            return view('products.barcode', [
                'product' => $product
            ]);
        } catch (\Exception $e) {
            abort(404, 'Product not found');
        }
    }

    public function printMultipleBarcodes(Request $request)
    {
        $productIds = $request->input('product_ids', []);
        $products = Product::whereIn('id', $productIds)->get();

        return view('products.barcodes-multiple', [
            'products' => $products
        ]);
    }
    public function getProductTypes()
    {
        return response()->json([
            'success' => true,
            'data' => [
                ['value' => 'PRODUCT', 'label' => 'Finished Product'],
                ['value' => 'RAW_MATERIAL', 'label' => 'Raw Material'],
                ['value' => 'BOTH', 'label' => 'Both'],
            ]
        ]);
    }
    public function getUomFamily($id)
{
    try {
        $product = Product::with('uom.baseUnit')->find($id);
        
        if (!$product) {
            return response()->json([
                'success' => false,
                'message' => 'Product not found'
            ], 404);
        }

        $productUom = $product->uom;
        
        if (!$productUom) {
            return response()->json([
                'success' => false,
                'message' => 'Product does not have a UOM assigned'
            ], 400);
        }

        // Determine the base unit ID
        $baseUnitId = $productUom->base_unit ?? $productUom->id;
        
        // Get the base unit
        $baseUnit = Uom::find($baseUnitId);
        
        // Get all UOMs in this family (base + all derived units)
        $uomFamily = Uom::where(function($query) use ($baseUnitId) {
            $query->where('id', $baseUnitId)  // Include base unit
                  ->orWhere('base_unit', $baseUnitId);  // Include all derived units
        })
        ->where('is_active', 1)
        ->get()
        ->map(function($uom) use ($baseUnitId) {
            return [
                'id' => $uom->id,
                'name' => $uom->name,
                'uom_short' => $uom->uom_short,
                'conversion_factor' => $uom->conversion_factor ?? 1,
                'is_base_unit' => $uom->id == $baseUnitId,
                'base_unit_id' => $baseUnitId
            ];
        })
        ->sortBy(function($uom) {
            // Sort: base unit first, then by conversion factor (ascending)
            if ($uom['is_base_unit']) {
                return 0; // Base unit comes first
            }
            return $uom['conversion_factor'];
        })
        ->values();

        return response()->json([
            'success' => true,
            'data' => [
                'product_id' => $product->id,
                'product_name' => $product->name,
                'product_uom_id' => $product->uom_id,
                'base_unit_id' => $baseUnitId,
                'base_unit_name' => $baseUnit->name,
                'uom_family' => $uomFamily
            ]
        ]);

    } catch (\Exception $e) {
        return response()->json([
            'success' => false,
            'message' => 'Error fetching UOM family: ' . $e->getMessage()
        ], 500);
    }
}
}
