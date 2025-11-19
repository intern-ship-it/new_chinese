<?php
// app/Http/Controllers/ManufacturingSettingsController.php

namespace App\Http\Controllers;

use App\Models\Product;
use App\Models\ProductManufacturingSetting;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Validator;

class ManufacturingSettingsController extends Controller
{
    /**
     * Get all product manufacturing settings
     */
    public function getProductSettings(Request $request)
    {
        try {
            $query = ProductManufacturingSetting::with('product');

            if ($request->manufacturing_type) {
                $query->where('manufacturing_type', $request->manufacturing_type);
            }

            if ($request->is_active !== null) {
                $query->where('is_active', $request->is_active);
            }

            if ($request->search) {
                $search = $request->search;
                $query->whereHas('product', function ($q) use ($search) {
                    $q->where('name', 'LIKE', "%{$search}%")
                        ->orWhere('product_code', 'LIKE', "%{$search}%");
                });
            }

            $settings = $query->paginate($request->per_page ?? 15);

            return response()->json([
                'success' => true,
                'data' => $settings
            ]);
        } catch (\Exception $e) {
            return response()->json([
                'success' => false,
                'message' => 'Failed to fetch product settings',
                'error' => $e->getMessage()
            ], 500);
        }
    }

    /**
     * Update product manufacturing settings
     */
    public function updateProductSettings(Request $request, $productId)
    {
        $validator = Validator::make($request->all(), [
            'manufacturing_type' => 'required|in:MANUFACTURABLE,RAW_MATERIAL,BOTH',
            'requires_quality_check' => 'nullable|boolean',
            'track_batches' => 'nullable|boolean',
            'standard_production_time' => 'nullable|numeric|min:0',
            'standard_batch_size' => 'nullable|numeric|min:0',
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
            $product = Product::findOrFail($productId);

            $setting = ProductManufacturingSetting::updateOrCreate(
                ['product_id' => $productId],
                [
                    'manufacturing_type' => $request->manufacturing_type,
                    'requires_quality_check' => $request->requires_quality_check ?? false,
                    'track_batches' => $request->track_batches ?? false,
                    'standard_production_time' => $request->standard_production_time,
                    'standard_batch_size' => $request->standard_batch_size,
                    'is_active' => $request->is_active ?? true,
                    'updated_by' => auth()->id()
                ]
            );

            if (!$setting->wasRecentlyCreated) {
                $setting->created_by = auth()->id();
                $setting->save();
            }

            return response()->json([
                'success' => true,
                'message' => 'Product settings updated successfully',
                'data' => $setting->load('product')
            ]);
        } catch (\Exception $e) {
            return response()->json([
                'success' => false,
                'message' => 'Failed to update product settings',
                'error' => $e->getMessage()
            ], 500);
        }
    }

    /**
     * Bulk update product manufacturing types
     */
    public function bulkUpdateProductTypes(Request $request)
    {
        $validator = Validator::make($request->all(), [
            'products' => 'required|array',
            'products.*.product_id' => 'required|exists:products,id',
            'products.*.manufacturing_type' => 'required|in:MANUFACTURABLE,RAW_MATERIAL,BOTH'
        ]);

        if ($validator->fails()) {
            return response()->json([
                'success' => false,
                'message' => 'Validation failed',
                'errors' => $validator->errors()
            ], 422);
        }

        try {
            $updated = 0;
            foreach ($request->products as $productData) {
                ProductManufacturingSetting::updateOrCreate(
                    ['product_id' => $productData['product_id']],
                    [
                        'manufacturing_type' => $productData['manufacturing_type'],
                        'is_active' => true,
                        'updated_by' => auth()->id()
                    ]
                );
                $updated++;
            }

            return response()->json([
                'success' => true,
                'message' => "{$updated} products updated successfully"
            ]);
        } catch (\Exception $e) {
            return response()->json([
                'success' => false,
                'message' => 'Failed to update products',
                'error' => $e->getMessage()
            ], 500);
        }
    }
}