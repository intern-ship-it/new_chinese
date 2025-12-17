<?php

namespace App\Http\Controllers;

use App\Models\AddonGroup;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Auth;
use Illuminate\Support\Facades\Validator;

class AddonGroupController extends Controller
{
    /**
     * Get all addon groups with pagination
     */
    public function index(Request $request)
    {
        try {
            $query = AddonGroup::with(['createdBy:id,name', 'updatedBy:id,name'])
                ->withCount('services');

            // Filter by status
            if ($request->filled('status')) {
                $query->where('status', $request->status);
            }

            // Search
            if ($request->filled('search')) {
                $search = $request->search;
                $query->where(function ($q) use ($search) {
                    $q->where('group_name', 'ILIKE', "%{$search}%")
                        ->orWhere('group_name_chinese', 'ILIKE', "%{$search}%")
                        ->orWhere('description', 'ILIKE', "%{$search}%");
                });
            }

            // Sorting
            $sortBy = $request->input('sort_by', 'display_order');
            $sortOrder = $request->input('sort_order', 'asc');
            $query->orderBy($sortBy, $sortOrder);

            // Pagination
            $perPage = $request->input('per_page', 10);
            $groups = $query->paginate($perPage);

            return response()->json([
                'success' => true,
                'data' => $groups->items(),
                'pagination' => [
                    'current_page' => $groups->currentPage(),
                    'total_pages' => $groups->lastPage(),
                    'per_page' => $groups->perPage(),
                    'total' => $groups->total(),
                    'from' => $groups->firstItem(),
                    'to' => $groups->lastItem()
                ]
            ]);
        } catch (\Exception $e) {
            return response()->json([
                'success' => false,
                'message' => 'Failed to fetch addon groups',
                'error' => $e->getMessage()
            ], 500);
        }
    }

    /**
     * Get single addon group
     */
    public function show($id)
    {
        try {
            $group = AddonGroup::with(['services', 'createdBy:id,name', 'updatedBy:id,name'])
                ->find($id);

            if (!$group) {
                return response()->json([
                    'success' => false,
                    'message' => 'Addon group not found'
                ], 404);
            }

            return response()->json([
                'success' => true,
                'data' => $group
            ]);
        } catch (\Exception $e) {
            return response()->json([
                'success' => false,
                'message' => 'Failed to fetch addon group',
                'error' => $e->getMessage()
            ], 500);
        }
    }

    /**
     * Create new addon group
     */
    public function store(Request $request)
    {
        $validator = Validator::make($request->all(), [
            'group_name' => 'required|string|max:255',
            'group_name_chinese' => 'nullable|string|max:255',
            'description' => 'nullable|string',
            'description_chinese' => 'nullable|string',
            'icon' => 'nullable|string|max:100',
            'display_order' => 'nullable|integer|min:0',
            'status' => 'required|integer|in:0,1'
        ]);

        if ($validator->fails()) {
            return response()->json([
                'success' => false,
                'message' => 'Validation failed',
                'errors' => $validator->errors()
            ], 422);
        }

        try {
            $group = AddonGroup::create([
                'group_name' => $request->group_name,
                'group_name_chinese' => $request->group_name_chinese,
                'description' => $request->description,
                'description_chinese' => $request->description_chinese,
                'icon' => $request->icon,
                'display_order' => $request->display_order ?? 0,
                'status' => $request->status,
                'created_by' => Auth::id()
            ]);

            return response()->json([
                'success' => true,
                'message' => 'Addon group created successfully',
                'data' => $group
            ], 201);
        } catch (\Exception $e) {
            return response()->json([
                'success' => false,
                'message' => 'Failed to create addon group',
                'error' => $e->getMessage()
            ], 500);
        }
    }

    /**
     * Update addon group
     */
    public function update(Request $request, $id)
    {
        $validator = Validator::make($request->all(), [
            'group_name' => 'required|string|max:255',
            'group_name_chinese' => 'nullable|string|max:255',
            'description' => 'nullable|string',
            'description_chinese' => 'nullable|string',
            'icon' => 'nullable|string|max:100',
            'display_order' => 'nullable|integer|min:0',
            'status' => 'required|integer|in:0,1'
        ]);

        if ($validator->fails()) {
            return response()->json([
                'success' => false,
                'message' => 'Validation failed',
                'errors' => $validator->errors()
            ], 422);
        }

        try {
            $group = AddonGroup::find($id);

            if (!$group) {
                return response()->json([
                    'success' => false,
                    'message' => 'Addon group not found'
                ], 404);
            }

            $group->update([
                'group_name' => $request->group_name,
                'group_name_chinese' => $request->group_name_chinese,
                'description' => $request->description,
                'description_chinese' => $request->description_chinese,
                'icon' => $request->icon,
                'display_order' => $request->display_order ?? 0,
                'status' => $request->status,
                'updated_by' => Auth::id()
            ]);

            return response()->json([
                'success' => true,
                'message' => 'Addon group updated successfully',
                'data' => $group
            ]);
        } catch (\Exception $e) {
            return response()->json([
                'success' => false,
                'message' => 'Failed to update addon group',
                'error' => $e->getMessage()
            ], 500);
        }
    }

    /**
     * Delete addon group
     */
    public function destroy($id)
    {
        try {
            $group = AddonGroup::find($id);

            if (!$group) {
                return response()->json([
                    'success' => false,
                    'message' => 'Addon group not found'
                ], 404);
            }

            // Check if group has services
            if ($group->services()->count() > 0) {
                return response()->json([
                    'success' => false,
                    'message' => 'Cannot delete group with existing services'
                ], 400);
            }

            $group->delete();

            return response()->json([
                'success' => true,
                'message' => 'Addon group deleted successfully'
            ]);
        } catch (\Exception $e) {
            return response()->json([
                'success' => false,
                'message' => 'Failed to delete addon group',
                'error' => $e->getMessage()
            ], 500);
        }
    }

    /**
     * Get active addon groups (for dropdowns)
     */
    public function getActiveGroups()
    {
        try {
            $groups = AddonGroup::active()
                ->ordered()
                ->select('id', 'group_name', 'group_name_chinese', 'icon')
                ->get();

            return response()->json([
                'success' => true,
                'data' => $groups
            ]);
        } catch (\Exception $e) {
            return response()->json([
                'success' => false,
                'message' => 'Failed to fetch active groups',
                'error' => $e->getMessage()
            ], 500);
        }
    }
}