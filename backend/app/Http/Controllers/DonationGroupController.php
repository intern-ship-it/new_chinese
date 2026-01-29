<?php

namespace App\Http\Controllers;

use App\Http\Controllers\Controller;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Auth;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Validator;
use App\Models\User;

class DonationGroupController extends Controller
{
    /**
     * Get all donation groups
     */
    public function index(Request $request)
    {
        try {
            $query = DB::table('donation_groups')
                ->whereNull('deleted_at');

            // Filter by status if provided
            if ($request->filled('status')) {
                $query->where('status', $request->status);
            }

            // Search by name or secondary_name if provided
            if ($request->filled('search')) {
                $search = $request->search;
                $query->where(function ($q) use ($search) {
                    $q->where('name', 'LIKE', "%{$search}%")
                      ->orWhere('secondary_name', 'LIKE', "%{$search}%");
                });
            }

            // Pagination
            $perPage = $request->get('per_page', 20);
            $page = $request->get('page', 1);
            $offset = ($page - 1) * $perPage;

            // Get total count
            $total = $query->count();

            // Get paginated data
            $groups = $query->orderBy('name')
                ->offset($offset)
                ->limit($perPage)
                ->get();

            $user = Auth::user();
            $permissions = $this->assignPermissions($user);

            return response()->json([
                'success' => true,
                'data' => [
                    'data' => $groups,
                    'current_page' => (int)$page,
                    'per_page' => (int)$perPage,
                    'total' => $total,
                    'last_page' => ceil($total / $perPage),
                    'from' => $offset + 1,
                    'to' => min($offset + $perPage, $total)
                ],
                'permissions' => $permissions
            ]);
        } catch (\Exception $e) {
            \Log::error('Error fetching donation groups: ' . $e->getMessage());
            return response()->json([
                'success' => false,
                'message' => 'Failed to fetch donation groups',
                'error' => $e->getMessage()
            ], 500);
        }
    }

    /**
     * Get active donation groups (for dropdown)
     */
    public function getActiveGroups()
    {
        try {
            $groups = DB::table('donation_groups')
                ->where('status', 1)
                ->whereNull('deleted_at')
                ->orderBy('name')
                ->select('id', 'name', 'secondary_name')
                ->get();

            return response()->json([
                'success' => true,
                'data' => $groups
            ]);
        } catch (\Exception $e) {
            \Log::error('Error fetching active groups: ' . $e->getMessage());
            return response()->json([
                'success' => false,
                'message' => 'Failed to fetch active groups',
                'error' => $e->getMessage()
            ], 500);
        }
    }

    /**
     * Get single donation group
     */
    public function show($id)
    {
        try {
            $group = DB::table('donation_groups')
                ->whereNull('deleted_at')
                ->where('id', $id)
                ->first();

            if (!$group) {
                return response()->json([
                    'success' => false,
                    'message' => 'Donation group not found'
                ], 404);
            }

            $user = Auth::user();
            $permissions = $this->assignPermissions($user);

            return response()->json([
                'success' => true,
                'data' => $group,
                'permissions' => $permissions
            ]);
        } catch (\Exception $e) {
            return response()->json([
                'success' => false,
                'message' => 'Failed to fetch donation group',
                'error' => $e->getMessage()
            ], 500);
        }
    }

    /**
     * Create new donation group
     */
    public function store(Request $request)
    {
        if (!Auth::user()->hasRole(['super_admin', 'admin'])) {
            return response()->json([
                'success' => false,
                'message' => 'You do not have permission to create donation groups'
            ], 403);
        }

        try {
            // Validate request
            $validator = Validator::make($request->all(), [
                'name' => 'required|string|max:300',
                'secondary_name' => 'nullable|string|max:300',
                'status' => 'boolean'
            ]);

            if ($validator->fails()) {
                return response()->json([
                    'success' => false,
                    'message' => 'Validation failed',
                    'errors' => $validator->errors()
                ], 422);
            }

            // Check if group with same name exists
            $exists = DB::table('donation_groups')
                ->where('name', $request->name)
                ->whereNull('deleted_at')
                ->exists();

            if ($exists) {
                return response()->json([
                    'success' => false,
                    'message' => 'Donation group with this name already exists'
                ], 422);
            }

            DB::beginTransaction();

            $id = DB::table('donation_groups')->insertGetId([
                'name' => $request->name,
                'secondary_name' => $request->secondary_name,
                'status' => $request->get('status', true) ? 1 : 0,
                'created_by' => Auth::id(),
                'created_at' => now(),
                'updated_at' => now()
            ]);

            DB::commit();

            $group = DB::table('donation_groups')->where('id', $id)->first();

            return response()->json([
                'success' => true,
                'message' => 'Donation group created successfully',
                'data' => $group
            ], 201);
        } catch (\Exception $e) {
            DB::rollBack();
            \Log::error('Error creating donation group: ' . $e->getMessage());
            return response()->json([
                'success' => false,
                'message' => 'Failed to create donation group',
                'error' => $e->getMessage()
            ], 500);
        }
    }

    /**
     * Update donation group
     */
    public function update(Request $request, $id)
    {
        if (!Auth::user()->hasRole(['super_admin', 'admin'])) {
            return response()->json([
                'success' => false,
                'message' => 'You do not have permission to edit donation groups'
            ], 403);
        }

        try {
            $group = DB::table('donation_groups')
                ->whereNull('deleted_at')
                ->where('id', $id)
                ->first();

            if (!$group) {
                return response()->json([
                    'success' => false,
                    'message' => 'Donation group not found'
                ], 404);
            }

            // Validate request
            $validator = Validator::make($request->all(), [
                'name' => 'string|max:300',
                'secondary_name' => 'nullable|string|max:300',
                'status' => 'boolean'
            ]);

            if ($validator->fails()) {
                return response()->json([
                    'success' => false,
                    'message' => 'Validation failed',
                    'errors' => $validator->errors()
                ], 422);
            }

            // Check if group with same name exists (excluding current)
            if ($request->has('name')) {
                $exists = DB::table('donation_groups')
                    ->where('name', $request->name)
                    ->where('id', '!=', $id)
                    ->whereNull('deleted_at')
                    ->exists();

                if ($exists) {
                    return response()->json([
                        'success' => false,
                        'message' => 'Donation group with this name already exists'
                    ], 422);
                }
            }

            DB::beginTransaction();

            $updateData = [
                'updated_by' => Auth::id(),
                'updated_at' => now()
            ];

            if ($request->has('name')) {
                $updateData['name'] = $request->name;
            }
            if ($request->has('secondary_name')) {
                $updateData['secondary_name'] = $request->secondary_name;
            }
            if ($request->has('status')) {
                $updateData['status'] = $request->status ? 1 : 0;
            }

            DB::table('donation_groups')
                ->where('id', $id)
                ->update($updateData);

            DB::commit();

            $updatedGroup = DB::table('donation_groups')->where('id', $id)->first();

            return response()->json([
                'success' => true,
                'message' => 'Donation group updated successfully',
                'data' => $updatedGroup
            ]);
        } catch (\Exception $e) {
            DB::rollBack();
            \Log::error('Error updating donation group: ' . $e->getMessage());
            return response()->json([
                'success' => false,
                'message' => 'Failed to update donation group',
                'error' => $e->getMessage()
            ], 500);
        }
    }

    /**
     * Delete donation group (soft delete)
     */
    public function destroy($id)
    {
        if (!Auth::user()->hasRole(['super_admin', 'admin'])) {
            return response()->json([
                'success' => false,
                'message' => 'You do not have permission to delete donation groups'
            ], 403);
        }

        try {
            $group = DB::table('donation_groups')
                ->whereNull('deleted_at')
                ->where('id', $id)
                ->first();

            if (!$group) {
                return response()->json([
                    'success' => false,
                    'message' => 'Donation group not found'
                ], 404);
            }

            DB::beginTransaction();

            DB::table('donation_groups')
                ->where('id', $id)
                ->update([
                    'deleted_at' => now(),
                    'deleted_by' => Auth::id()
                ]);

            DB::commit();

            return response()->json([
                'success' => true,
                'message' => 'Donation group deleted successfully'
            ]);
        } catch (\Exception $e) {
            DB::rollBack();
            \Log::error('Error deleting donation group: ' . $e->getMessage());
            return response()->json([
                'success' => false,
                'message' => 'Failed to delete donation group',
                'error' => $e->getMessage()
            ], 500);
        }
    }

    /**
     * Get permissions for a specific user
     */
    public function getUserPermissions($userId)
    {
        $user = User::find($userId);

        if (!$user) {
            return response()->json([
                'success' => false,
                'message' => 'User not found'
            ], 404);
        }

        $permissions = $this->assignPermissions($user);

        return response()->json([
            'success' => true,
            'data' => $permissions
        ]);
    }

    /**
     * Assign permissions based on user role
     */
    private function assignPermissions(User $user)
    {
        $hasAdminRole = $user->hasRole(['super_admin', 'admin']);

        return [
            'can_create_donation_groups' => $hasAdminRole,
            'can_edit_donation_groups' => $hasAdminRole,
            'can_delete_donation_groups' => $hasAdminRole,
            'can_view_donation_groups' => true,
        ];
    }
}