<?php

namespace App\Http\Controllers;

use App\Models\TowerCategory;
use App\Traits\ApiResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Validator;
use Illuminate\Support\Facades\DB;

class TowerCategoryController extends Controller
{
    use ApiResponse;

    /**
     * Get all tower categories
     */
    public function index(Request $request)
    {
        try {
            $query = TowerCategory::with(['creator', 'updater']);
            
            // Filter by active status
            if ($request->has('is_active')) {
                $query->where('is_active', $request->boolean('is_active'));
            }
            
            // Search
            if ($request->has('search')) {
                $search = $request->search;
                $query->where(function($q) use ($search) {
                    $q->where('name_primary', 'ILIKE', "%{$search}%")
                      ->orWhere('name_secondary', 'ILIKE', "%{$search}%");
                });
            }
            
            $categories = $query->ordered()->get()->map(function($category) {
                return [
                    'id' => $category->id,
                    'name_primary' => $category->name_primary,
                    'name_secondary' => $category->name_secondary,
                    'full_name' => $category->full_name,
                    'description' => $category->description,
                    'is_active' => $category->is_active,
                    'display_order' => $category->display_order,
                    'towers_count' => $category->towers()->count(),
                    'created_by' => $category->creator ? $category->creator->name : null,
                    'created_at' => $category->created_at,
                    'updated_at' => $category->updated_at
                ];
            });
            
            return $this->successResponse($categories, 'Categories retrieved successfully');
            
        } catch (\Exception $e) {
            return $this->errorResponse('Failed to retrieve categories: ' . $e->getMessage(), 500);
        }
    }

    /**
     * Get single category
     */
    public function show($id)
    {
        try {
            $category = TowerCategory::with(['towers', 'creator', 'updater'])->findOrFail($id);
            
            $data = [
                'id' => $category->id,
                'name_primary' => $category->name_primary,
                'name_secondary' => $category->name_secondary,
                'full_name' => $category->full_name,
                'description' => $category->description,
                'is_active' => $category->is_active,
                'display_order' => $category->display_order,
                'towers_count' => $category->towers->count(),
                'towers' => $category->towers->map(function($tower) {
                    return [
                        'id' => $tower->id,
                        'tower_name' => $tower->tower_name,
                        'tower_code' => $tower->tower_code,
                        'status' => $tower->status
                    ];
                }),
                'created_by' => $category->creator ? $category->creator->name : null,
                'created_at' => $category->created_at,
                'updated_at' => $category->updated_at
            ];
            
            return $this->successResponse($data, 'Category retrieved successfully');
            
        } catch (\Exception $e) {
            return $this->notFoundResponse('Category not found');
        }
    }

    /**
     * Create new category
     */
    public function store(Request $request)
    {
        $validator = Validator::make($request->all(), [
            'name_primary' => 'required|string|max:100',
            'name_secondary' => 'nullable|string|max:100',
            'description' => 'nullable|string',
            'is_active' => 'boolean',
            'display_order' => 'nullable|integer|min:0'
        ]);

        if ($validator->fails()) {
            return $this->validationErrorResponse($validator->errors());
        }

        try {
            DB::beginTransaction();
            
            $category = TowerCategory::create([
                'name_primary' => $request->name_primary,
                'name_secondary' => $request->name_secondary,
                'description' => $request->description,
                'is_active' => $request->is_active ?? true,
                'display_order' => $request->display_order ?? 0,
                'created_by' => auth()->id()
            ]);

            DB::commit();
            
            return $this->successResponse(
                $category->load('creator'), 
                'Category created successfully', 
                201
            );

        } catch (\Exception $e) {
            DB::rollBack();
            return $this->errorResponse('Failed to create category: ' . $e->getMessage(), 500);
        }
    }

    /**
     * Update category
     */
    public function update(Request $request, $id)
    {
        $validator = Validator::make($request->all(), [
            'name_primary' => 'required|string|max:100',
            'name_secondary' => 'nullable|string|max:100',
            'description' => 'nullable|string',
            'is_active' => 'boolean',
            'display_order' => 'nullable|integer|min:0'
        ]);

        if ($validator->fails()) {
            return $this->validationErrorResponse($validator->errors());
        }

        try {
            DB::beginTransaction();
            
            $category = TowerCategory::findOrFail($id);
            
            $category->update([
                'name_primary' => $request->name_primary,
                'name_secondary' => $request->name_secondary,
                'description' => $request->description,
                'is_active' => $request->is_active,
                'display_order' => $request->display_order,
                'updated_by' => auth()->id()
            ]);

            DB::commit();
            
            return $this->successResponse(
                $category->fresh(['creator', 'updater']), 
                'Category updated successfully'
            );

        } catch (\Exception $e) {
            DB::rollBack();
            return $this->errorResponse('Failed to update category: ' . $e->getMessage(), 500);
        }
    }

    /**
     * Delete category
     */
    public function destroy($id)
    {
        try {
            $category = TowerCategory::findOrFail($id);
            
            // Check if category has towers
            if ($category->towers()->exists()) {
                return $this->errorResponse(
                    'Cannot delete category with existing towers. Please reassign or delete towers first.', 
                    400
                );
            }
            
            $category->delete();

            return $this->successResponse(null, 'Category deleted successfully');

        } catch (\Exception $e) {
            return $this->errorResponse('Failed to delete category: ' . $e->getMessage(), 500);
        }
    }

    /**
     * Get active categories for dropdown
     */
    public function getActiveCategories()
    {
        try {
            $categories = TowerCategory::active()
                ->ordered()
                ->get()
                ->map(function($category) {
                    return [
                        'id' => $category->id,
                        'name_primary' => $category->name_primary,
                        'name_secondary' => $category->name_secondary,
                        'full_name' => $category->full_name,
                        'display_order' => $category->display_order
                    ];
                });
            
            return $this->successResponse($categories, 'Active categories retrieved successfully');
            
        } catch (\Exception $e) {
            return $this->errorResponse('Failed to retrieve categories: ' . $e->getMessage(), 500);
        }
    }
}
