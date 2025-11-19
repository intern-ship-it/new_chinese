<?php
// app/Http/Controllers/InventoryCategoryController.php

namespace App\Http\Controllers;

use App\Http\Controllers\Controller;
use App\Models\ItemCategory;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Validator;
use Illuminate\Support\Facades\Auth;

class InventoryCategoryController extends Controller
{
    /**
     * Get all categories with hierarchy
     */
    public function index(Request $request)
    {
        try {
            $query = ItemCategory::with(['parent', 'children']);

            // Filter by active status
            if ($request->has('is_active')) {
                $query->where('is_active', $request->is_active);
            }

            // Search by name or code
            if ($request->filled('search')) {
                $search = $request->search;
                $query->where(function ($q) use ($search) {
                    $q->where('category_name', 'ILIKE', "%{$search}%")
                        ->orWhere('category_code', 'ILIKE', "%{$search}%");
                });
            }

            $categories = $query->orderBy('category_code', 'asc')->get();
            $user = Auth::user();

            $permissions = [
                'can_create_categories' => $user->can('categories.create'),
                'can_edit_categories' => $user->can('categories.edit'),
                'can_delete_categories' => $user->can('categories.delete'),
                'can_view_categories' => $user->can('categories.view'),
            ];
    
            return response()->json([
                'success' => true,
                'data' => $categories,
                'permissions' => $permissions
            ]);
        } catch (\Exception $e) {
            return response()->json([
                'success' => false,
                'message' => 'Error fetching categories: ' . $e->getMessage()
            ], 500);
        }
    }

    /**
     * Get category by ID
     */
    public function show($id)
    {
        try {
            $user = Auth::user();
            $category = ItemCategory::with(['parent', 'children', 'items'])->find($id);
            $permissions = [
                'can_edit_categories' => $user->can('categories.edit'),
                'can_delete_categories' => $user->can('categories.delete'),
            ];

            if (!$category) {
                return response()->json([
                    'success' => false,
                    'message' => 'Category not found'
                ], 404);
            }

            return response()->json([
                'success' => true,
                'data' => $category,
                'permissions' => $permissions
            ]);
        } catch (\Exception $e) {
            return response()->json([
                'success' => false,
                'message' => 'Error fetching category: ' . $e->getMessage()
            ], 500);
        }
    }

    /**
     * Create new category
     */
    public function store(Request $request)
    {
        if (!Auth::user()->can('categories.create')) {
            return response()->json([
                'success' => false,
                'message' => 'You do not have permission to create categories'
            ], 403);
        }
        $validator = Validator::make($request->all(), [
            'category_name' => 'required|string|max:100',
            'category_code' => 'nullable|string|max:20|unique:item_categories',
            'parent_id' => 'nullable|exists:item_categories,id',
            'is_active' => 'boolean'
        ]);

        if ($validator->fails()) {
            return response()->json([
                'success' => false,
                'errors' => $validator->errors()
            ], 422);
        }

        DB::beginTransaction();
        try {
            // Generate category code if not provided
            if (!$request->filled('category_code')) {
                $request->merge(['category_code' => $this->generateCategoryCode()]);
            }

            $category = ItemCategory::create($request->all());

            DB::commit();

            return response()->json([
                'success' => true,
                'message' => 'Category created successfully',
                'data' => $category->load(['parent', 'children'])
            ], 201);
        } catch (\Exception $e) {
            DB::rollback();
            return response()->json([
                'success' => false,
                'message' => 'Error creating category: ' . $e->getMessage()
            ], 500);
        }
    }

    /**
     * Update category
     */
    public function update(Request $request, $id)
    {

        if (!Auth::user()->can('categories.edit')) {
            return response()->json([
                'success' => false,
                'message' => 'You do not have permission to edit categories'
            ], 403);
        }

        $category = ItemCategory::find($id);

        if (!$category) {
            return response()->json([
                'success' => false,
                'message' => 'Category not found'
            ], 404);
        }

        $validator = Validator::make($request->all(), [
            'category_name' => 'required|string|max:100',
            'category_code' => 'required|string|max:20|unique:item_categories,category_code,' . $id,
            'parent_id' => 'nullable|exists:item_categories,id|not_in:' . $id,
            'is_active' => 'boolean'
        ]);

        if ($validator->fails()) {
            return response()->json([
                'success' => false,
                'errors' => $validator->errors()
            ], 422);
        }

        // Prevent setting self as parent
        if ($request->parent_id == $id) {
            return response()->json([
                'success' => false,
                'message' => 'Category cannot be its own parent'
            ], 422);
        }

        // Prevent circular hierarchy
        if ($request->parent_id && $this->wouldCreateCircularHierarchy($id, $request->parent_id)) {
            return response()->json([
                'success' => false,
                'message' => 'This would create a circular hierarchy'
            ], 422);
        }

        DB::beginTransaction();
        try {
            $category->update($request->all());

            DB::commit();

            return response()->json([
                'success' => true,
                'message' => 'Category updated successfully',
                'data' => $category->load(['parent', 'children'])
            ]);
        } catch (\Exception $e) {
            DB::rollback();
            return response()->json([
                'success' => false,
                'message' => 'Error updating category: ' . $e->getMessage()
            ], 500);
        }
    }

    /**
     * Delete category
     */
    public function destroy($id)
    {
        if (!Auth::user()->can('categories.delete')) {
            return response()->json([
                'success' => false,
                'message' => 'You do not have permission to delete categories'
            ], 403);
        }

        $category = ItemCategory::find($id);

        if (!$category) {
            return response()->json([
                'success' => false,
                'message' => 'Category not found'
            ], 404);
        }

        // Check if category has items
        if ($category->items()->exists()) {
            return response()->json([
                'success' => false,
                'message' => 'Cannot delete category with existing items'
            ], 422);
        }

        // Check if category has children
        if ($category->children()->exists()) {
            return response()->json([
                'success' => false,
                'message' => 'Cannot delete category with subcategories'
            ], 422);
        }

        DB::beginTransaction();
        try {
            $category->delete();

            DB::commit();

            return response()->json([
                'success' => true,
                'message' => 'Category deleted successfully'
            ]);
        } catch (\Exception $e) {
            DB::rollback();
            return response()->json([
                'success' => false,
                'message' => 'Error deleting category: ' . $e->getMessage()
            ], 500);
        }
    }

    /**
     * Get hierarchical tree
     */
    public function getTree()
    {
        try {
            $categories = ItemCategory::where('is_active', true)
                ->whereNull('parent_id')
                ->with('children')
                ->orderBy('category_code')
                ->get();

            $tree = $this->buildTree($categories);

            return response()->json([
                'success' => true,
                'data' => $tree
            ]);
        } catch (\Exception $e) {
            return response()->json([
                'success' => false,
                'message' => 'Error fetching category tree: ' . $e->getMessage()
            ], 500);
        }
    }

    /**
     * Generate category code
     */
    private function generateCategoryCode()
    {
        $lastCategory = ItemCategory::orderBy('id', 'desc')->first();

        if (!$lastCategory) {
            return 'CT0001';
        }

        // Extract number from last code
        preg_match('/(\d+)$/', $lastCategory->category_code, $matches);
        $nextNumber = isset($matches[1]) ? intval($matches[1]) + 1 : 1;

        return 'CT' . str_pad($nextNumber, 4, '0', STR_PAD_LEFT);
    }

    /**
     * Check if setting parent would create circular hierarchy
     */
    private function wouldCreateCircularHierarchy($categoryId, $parentId)
    {
        $parent = ItemCategory::find($parentId);

        while ($parent) {
            if ($parent->id == $categoryId) {
                return true;
            }
            $parent = $parent->parent;
        }

        return false;
    }

    /**
     * Build hierarchical tree structure
     */
    private function buildTree($categories, $parentId = null)
    {
        $tree = [];

        foreach ($categories as $category) {
            $node = [
                'id' => $category->id,
                'code' => $category->category_code,
                'name' => $category->category_name,
                'parent_id' => $category->parent_id,
                'is_active' => $category->is_active,
                'children' => []
            ];

            if ($category->children->count() > 0) {
                $node['children'] = $this->buildTree($category->children, $category->id);
            }

            $tree[] = $node;
        }

        return $tree;
    }

    /**
     * Toggle category status
     */
    public function toggleStatus($id)
    {
        $category = ItemCategory::find($id);

        if (!$category) {
            return response()->json([
                'success' => false,
                'message' => 'Category not found'
            ], 404);
        }

        DB::beginTransaction();
        try {
            $category->is_active = !$category->is_active;
            $category->save();

            DB::commit();

            return response()->json([
                'success' => true,
                'message' => 'Category status updated successfully',
                'data' => $category
            ]);
        } catch (\Exception $e) {
            DB::rollback();
            return response()->json([
                'success' => false,
                'message' => 'Error updating status: ' . $e->getMessage()
            ], 500);
        }
    }
}
