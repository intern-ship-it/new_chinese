<?php

namespace App\Http\Controllers;

use App\Http\Controllers\Controller;
use App\Models\SaleCategory;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Validator;
use Exception;

class SaleCategoryController extends Controller
{
    /**
     * Display a listing of sale categories
     */
    public function index(Request $request)
    {
        try {
            $query = SaleCategory::query();

            // Filter by status
            if ($request->has('status')) {
                $query->where('status', $request->boolean('status'));
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
            $query->ordered();

            $categories = $query->get();

            return response()->json([
                'success' => true,
                'data' => $categories
            ]);
        } catch (Exception $e) {
            return response()->json([
                'success' => false,
                'message' => 'Failed to fetch sale categories',
                'error' => $e->getMessage()
            ], 500);
        }
    }

    /**
     * Get all active sale categories
     */
    public function active()
    {
        try {
            $categories = SaleCategory::active()->ordered()->get();

            return response()->json([
                'success' => true,
                'data' => $categories
            ]);
        } catch (Exception $e) {
            return response()->json([
                'success' => false,
                'message' => 'Failed to fetch active sale categories',
                'error' => $e->getMessage()
            ], 500);
        }
    }

    /**
     * Store a newly created sale category
     */
    public function store(Request $request)
    {
        $validator = Validator::make($request->all(), [
            'name_primary' => 'required|string|max:255',
            'name_secondary' => 'nullable|string|max:255',
            'description' => 'nullable|string',
            'short_code' => 'required|string|max:50|unique:sale_categories,short_code',
            'status' => 'boolean',
            'order_no' => 'integer|min:0',
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

            $category = SaleCategory::create([
                'name_primary' => $request->name_primary,
                'name_secondary' => $request->name_secondary,
                'description' => $request->description,
                'short_code' => strtoupper($request->short_code),
                'status' => $request->boolean('status', true),
                'order_no' => $request->order_no ?? 0,
                'created_by' => $request->user()->id ?? null,
            ]);

            DB::commit();

            return response()->json([
                'success' => true,
                'message' => 'Sale category created successfully',
                'data' => $category
            ], 201);
        } catch (Exception $e) {
            DB::rollBack();
            return response()->json([
                'success' => false,
                'message' => 'Failed to create sale category',
                'error' => $e->getMessage()
            ], 500);
        }
    }

    /**
     * Display the specified sale category
     */
    public function show($id)
    {
        try {
            $category = SaleCategory::with(['saleItems'])->findOrFail($id);

            return response()->json([
                'success' => true,
                'data' => $category
            ]);
        } catch (Exception $e) {
            return response()->json([
                'success' => false,
                'message' => 'Sale category not found',
                'error' => $e->getMessage()
            ], 404);
        }
    }

    /**
     * Update the specified sale category
     */
    public function update(Request $request, $id)
    {
        $validator = Validator::make($request->all(), [
            'name_primary' => 'required|string|max:255',
            'name_secondary' => 'nullable|string|max:255',
            'description' => 'nullable|string',
            'short_code' => 'required|string|max:50|unique:sale_categories,short_code,' . $id,
            'status' => 'boolean',
            'order_no' => 'integer|min:0',
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

            $category = SaleCategory::findOrFail($id);
            $category->update([
                'name_primary' => $request->name_primary,
                'name_secondary' => $request->name_secondary,
                'description' => $request->description,
                'short_code' => strtoupper($request->short_code),
                'status' => $request->boolean('status', true),
                'order_no' => $request->order_no ?? 0,
                'updated_by' => $request->user()->id ?? null,
            ]);

            DB::commit();

            return response()->json([
                'success' => true,
                'message' => 'Sale category updated successfully',
                'data' => $category
            ]);
        } catch (Exception $e) {
            DB::rollBack();
            return response()->json([
                'success' => false,
                'message' => 'Failed to update sale category',
                'error' => $e->getMessage()
            ], 500);
        }
    }

    /**
     * Remove the specified sale category
     */
    public function destroy($id)
    {
        try {
            DB::beginTransaction();

            $category = SaleCategory::findOrFail($id);
            
            // Check if category is being used by any sale items
            $itemsCount = $category->saleItems()->count();
            if ($itemsCount > 0) {
                return response()->json([
                    'success' => false,
                    'message' => "Cannot delete category. It is being used by {$itemsCount} sale item(s)."
                ], 422);
            }

            $category->delete();

            DB::commit();

            return response()->json([
                'success' => true,
                'message' => 'Sale category deleted successfully'
            ]);
        } catch (Exception $e) {
            DB::rollBack();
            return response()->json([
                'success' => false,
                'message' => 'Failed to delete sale category',
                'error' => $e->getMessage()
            ], 500);
        }
    }
}