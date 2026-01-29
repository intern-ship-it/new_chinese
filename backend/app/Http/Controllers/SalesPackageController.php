<?php

namespace App\Http\Controllers;

use App\Models\SalesPackage;
use App\Models\Product;
use App\Models\SaleItem;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Auth;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Validator;

class SalesPackageController extends Controller
{
    /**
     * Get all sales packages with pagination and filters
     */
    public function index(Request $request)
    {
        try {
            $query = SalesPackage::with(['createdBy:id,name', 'updatedBy:id,name']);

            // Filter by status (active/inactive)
            if ($request->filled('is_active')) {
                $query->where('is_active', $request->is_active === 'true' || $request->is_active === '1' || $request->is_active === 1);
            }

            // Filter by date range
            if ($request->filled('start_date')) {
                $query->whereDate('package_date', '>=', $request->start_date);
            }
            if ($request->filled('end_date')) {
                $query->whereDate('package_date', '<=', $request->end_date);
            }

            // Search by package number
            if ($request->filled('search')) {
                $query->where('package_number', 'LIKE', '%' . $request->search . '%');
            }

            // Sorting
            $sortBy = $request->input('sort_by', 'created_at');
            $sortOrder = $request->input('sort_order', 'desc');
            $query->orderBy($sortBy, $sortOrder);

            // Pagination
            $perPage = $request->input('per_page', 20);
            $packages = $query->paginate($perPage);

            return response()->json([
                'success' => true,
                'data' => $packages
            ]);
        } catch (\Exception $e) {
            return response()->json([
                'success' => false,
                'message' => 'Failed to fetch sales packages',
                'error' => $e->getMessage()
            ], 500);
        }
    }

    /**
     * Get single sales package
     */
    public function show($id)
    {
        try {
            $package = SalesPackage::with(['createdBy:id,name', 'updatedBy:id,name'])->find($id);

            if (!$package) {
                return response()->json([
                    'success' => false,
                    'message' => 'Sales package not found'
                ], 404);
            }

            return response()->json([
                'success' => true,
                'data' => $package
            ]);
        } catch (\Exception $e) {
            return response()->json([
                'success' => false,
                'message' => 'Failed to fetch sales package',
                'error' => $e->getMessage()
            ], 500);
        }
    }

    /**
     * Create new sales package
     */
    public function store(Request $request)
    {
        $validator = Validator::make($request->all(), [
            'package_date' => 'required|date',
            'package_name' => 'nullable|string|max:255',
            'items' => 'required|array|min:1',
            'items.*.type' => 'required|in:product,sales_item',
            'items.*.item_id' => 'required|integer',
            'items.*.quantity' => 'required|numeric|min:0.01',
            'items.*.rate' => 'nullable|numeric|min:0',
            'items.*.amount' => 'nullable|numeric|min:0',
            'total_amount' => 'required|numeric|min:0',
            'tax_rate' => 'nullable|numeric|min:0',
            'tax_amount' => 'nullable|numeric|min:0',
            'discount' => 'nullable|numeric|min:0',
            'description' => 'nullable|string',
            'is_active' => 'nullable|boolean'
        ]);

        if ($validator->fails()) {
            return response()->json([
                'success' => false,
                'message' => 'Validation failed',
                'errors' => $validator->errors()
            ], 422);
        }

        try {
            DB::beginTransaction();

            $package = new SalesPackage();
            $package->package_date = $request->package_date;
            $package->package_name = $request->package_name;
            $package->items = $request->items;
            $package->total_amount = $request->total_amount ?? 0;
            $package->tax_rate = $request->tax_rate ?? 0;
            $package->discount = $request->discount ?? 0;
            $package->description = $request->description;
            $package->is_active = $request->is_active ?? true;
            $package->created_by = Auth::id();

            // Calculate totals
            $package->calculateTotals();
            
            $package->save();

            DB::commit();

            return response()->json([
                'success' => true,
                'message' => 'Sales package created successfully',
                'data' => $package
            ], 201);
        } catch (\Exception $e) {
            DB::rollBack();
            return response()->json([
                'success' => false,
                'message' => 'Failed to create sales package',
                'error' => $e->getMessage()
            ], 500);
        }
    }

    /**
     * Update sales package
     */
    public function update(Request $request, $id)
    {
        $validator = Validator::make($request->all(), [
            'package_date' => 'required|date',
            'package_name' => 'nullable|string|max:255',
            'items' => 'required|array|min:1',
            'items.*.type' => 'required|in:product,sales_item',
            'items.*.item_id' => 'required|integer',
            'items.*.quantity' => 'required|numeric|min:0.01',
            'items.*.rate' => 'nullable|numeric|min:0',
            'items.*.amount' => 'nullable|numeric|min:0',
            'total_amount' => 'required|numeric|min:0',
            'tax_rate' => 'nullable|numeric|min:0',
            'tax_amount' => 'nullable|numeric|min:0',
            'discount' => 'nullable|numeric|min:0',
            'description' => 'nullable|string',
            'is_active' => 'nullable|boolean'
        ]);

        if ($validator->fails()) {
            return response()->json([
                'success' => false,
                'message' => 'Validation failed',
                'errors' => $validator->errors()
            ], 422);
        }

        try {
            $package = SalesPackage::find($id);

            if (!$package) {
                return response()->json([
                    'success' => false,
                    'message' => 'Sales package not found'
                ], 404);
            }

            DB::beginTransaction();

            $package->package_date = $request->package_date;
            $package->package_name = $request->package_name;
            $package->items = $request->items;
            $package->total_amount = $request->total_amount ?? 0;
            $package->tax_rate = $request->tax_rate ?? 0;
            $package->discount = $request->discount ?? 0;
            $package->description = $request->description;
            $package->is_active = $request->is_active ?? $package->is_active;
            $package->updated_by = Auth::id();

            // Calculate totals
            $package->calculateTotals();
            
            $package->save();

            DB::commit();

            return response()->json([
                'success' => true,
                'message' => 'Sales package updated successfully',
                'data' => $package
            ]);
        } catch (\Exception $e) {
            DB::rollBack();
            return response()->json([
                'success' => false,
                'message' => 'Failed to update sales package',
                'error' => $e->getMessage()
            ], 500);
        }
    }

    /**
     * Delete sales package (soft delete)
     */
    public function destroy($id)
    {
        try {
            $package = SalesPackage::find($id);

            if (!$package) {
                return response()->json([
                    'success' => false,
                    'message' => 'Sales package not found'
                ], 404);
            }

            $package->delete();

            return response()->json([
                'success' => true,
                'message' => 'Sales package deleted successfully'
            ]);
        } catch (\Exception $e) {
            return response()->json([
                'success' => false,
                'message' => 'Failed to delete sales package',
                'error' => $e->getMessage()
            ], 500);
        }
    }

    /**
     * Get products for dropdown
     */
    public function getProducts()
    {
        try {
            $products = Product::with(['uom', 'uom.baseUnit'])
                ->select('id', 'name', 'product_code', 'uom_id', 'unit_price')
                ->where('is_active', 1)
                ->orderBy('name')
                ->get()
                ->map(function ($product) {
                    $baseUnit = '';
                    $unitDisplay = '';
                    
                    if ($product->uom) {
                        // The product's primary UOM
                        $unitDisplay = $product->uom->name ?? '';
                        
                        // If this UOM has a base unit, use it; otherwise use the UOM itself as base
                        if ($product->uom->baseUnit) {
                            $baseUnit = $product->uom->baseUnit->name ?? '';
                        } else {
                            // This UOM is itself a base unit
                            $baseUnit = $product->uom->name ?? '';
                        }
                    }
                    
                    return [
                        'id' => $product->id,
                        'product_name' => $product->name,
                        'product_code' => $product->product_code,
                        'base_unit' => $baseUnit,
                        'unit_display' => $unitDisplay,
                        'price' => $product->unit_price ?? 0
                    ];
                });

            return response()->json([
                'success' => true,
                'data' => $products
            ]);
        } catch (\Exception $e) {
            return response()->json([
                'success' => false,
                'message' => 'Failed to fetch products',
                'error' => $e->getMessage()
            ], 500);
        }
    }

    /**
     * Get sales items for dropdown
     */
    public function getSalesItems()
    {
        try {
            $salesItems = SaleItem::select('id', 'name_primary', 'name_secondary', 'price', 'short_code')
                ->where('status', 1)
                ->orderBy('name_primary')
                ->get()
                ->map(function ($item) {
                    return [
                        'id' => $item->id,
                        'item_name' => $item->name_primary, // Map 'name_primary' to 'item_name' for frontend
                        'item_name_chinese' => $item->name_secondary,
                        'price' => $item->price,
                        'short_code' => $item->short_code
                    ];
                });

            return response()->json([
                'success' => true,
                'data' => $salesItems
            ]);
        } catch (\Exception $e) {
            return response()->json([
                'success' => false,
                'message' => 'Failed to fetch sales items',
                'error' => $e->getMessage()
            ], 500);
        }
    }

    /**
     * Generate next package number
     */
    public function generatePackageNumber(Request $request)
    {
        try {
            $date = $request->filled('date') ? \Carbon\Carbon::parse($request->date) : now();
            $packageNumber = SalesPackage::generatePackageNumber($date);

            return response()->json([
                'success' => true,
                'data' => [
                    'package_number' => $packageNumber
                ]
            ]);
        } catch (\Exception $e) {
            return response()->json([
                'success' => false,
                'message' => 'Failed to generate package number',
                'error' => $e->getMessage()
            ], 500);
        }
    }

    /**
     * Get taxes applicable for packages
     */
    public function getTaxes()
    {
        try {
            $taxes = DB::table('tax_master')
                ->select('id', 'name', 'percent', 'applicable_for')
                ->where('status', 1)
                ->where('applicable_for', 'LIKE', '%package%')
                ->orderBy('name')
                ->get()
                ->map(function ($tax) {
                    return [
                        'id' => $tax->id,
                        'name' => $tax->name,
                        'rate' => $tax->percent,
                        'applicable_for' => $tax->applicable_for
                    ];
                });

            return response()->json([
                'success' => true,
                'data' => $taxes
            ]);
        } catch (\Exception $e) {
            return response()->json([
                'success' => false,
                'message' => 'Failed to fetch taxes',
                'error' => $e->getMessage()
            ], 500);
        }
    }
}