<?php

namespace App\Http\Controllers;

use App\Http\Controllers\Controller;
use App\Models\DonationMaster;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Auth;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Validator;
use App\Models\User;

class DonationMasterController extends Controller
{
    /**
     * Get all donation masters
     */
    public function index(Request $request)
    {
        try {
            $query = DonationMaster::whereNull('deleted_at');

            // Filter by status if provided
            if ($request->filled('status')) {
                $query->where('status', $request->status);
            }

            // Search by name or type if provided
            if ($request->filled('search')) {
                $search = $request->search;
                $query->where(function ($q) use ($search) {
                    $q->where('name', 'LIKE', "%{$search}%")
                        ->orWhere('type', 'LIKE', "%{$search}%");
                });
            }

            // Pagination
            $perPage = $request->get('per_page', 20);
            $donations = $query->orderBy('name')->paginate($perPage);

            $user = Auth::user();
            $permissions = $this->assignPermissions($user);

            return response()->json([
                'success' => true,
                'data' => $donations,
                'permissions' => $permissions
            ]);
        } catch (\Exception $e) {
            return response()->json([
                'success' => false,
                'message' => 'Failed to fetch donation masters',
                'error' => $e->getMessage()
            ], 500);
        }
    }


    /**
     * Get unique donation types from existing records
     */
    public function getTypes()
    {
        try {
            $types = DonationMaster::whereNull('deleted_at')
                ->distinct()
                ->pluck('type')
                ->filter()
                ->sort()
                ->values();

            return response()->json([
                'success' => true,
                'data' => $types
            ]);
        } catch (\Exception $e) {
            return response()->json([
                'success' => false,
                'message' => 'Failed to fetch types',
                'error' => $e->getMessage()
            ], 500);
        }
    }

    /**
     * Debug permissions
     */
    public function debugPermissions()
    {
        $user = Auth::user();

        return response()->json([
            'user_id' => $user->id,
            'user_email' => $user->email,
            'roles' => $user->roles->map(function ($role) {
                return [
                    'name' => $role->name,
                    'guard_name' => $role->guard_name
                ];
            }),
            'all_permissions' => $user->getAllPermissions()->map(function ($perm) {
                return [
                    'name' => $perm->name,
                    'guard_name' => $perm->guard_name
                ];
            }),
            'direct_checks' => [
                'donation_masters.view' => $user->can('donation_masters.view'),
                'donation_masters.create' => $user->can('donation_masters.create'),
                'donation_masters.edit' => $user->can('donation_masters.edit'),
                'donation_masters.delete' => $user->can('donation_masters.delete'),
            ],
            'with_web_guard' => [
                'donation_masters.view' => $user->hasPermissionTo('donation_masters.view', 'web'),
                'donation_masters.create' => $user->hasPermissionTo('donation_masters.create', 'web'),
                'donation_masters.edit' => $user->hasPermissionTo('donation_masters.edit', 'web'),
                'donation_masters.delete' => $user->hasPermissionTo('donation_masters.delete', 'web'),
            ]
        ]);
    }
    /**
     * Get single donation master
     */
    public function show($id)
    {
        $user = Auth::user();
        $permissions = $this->assignPermissions($user);

        try {
            $donation = DonationMaster::whereNull('deleted_at')->find($id);

            if (!$donation) {
                return response()->json([
                    'success' => false,
                    'message' => 'Donation master not found'
                ], 404);
            }

            return response()->json([
                'success' => true,
                'data' => $donation,
                'permissions' => $permissions
            ]);
        } catch (\Exception $e) {
            return response()->json([
                'success' => false,
                'message' => 'Failed to fetch donation master',
                'error' => $e->getMessage()
            ], 500);
        }
    }

    /**
     * Create new donation master
     */
    public function store(Request $request)
    {
        if (!Auth::user()->hasRole(['super_admin', 'admin'])) {
            return response()->json([
                'success' => false,
                'message' => 'You do not have permission to create donation masters'
            ], 403);
        }

        try {
            // Validate request
            $validator = Validator::make($request->all(), [
                'name' => 'required|string|max:300',
                'type' => 'required|string|max:50',  // ← Changed from enum to string
                'details' => 'nullable|string',
                'status' => 'integer|in:0,1'
            ]);

            if ($validator->fails()) {
                return response()->json([
                    'success' => false,
                    'message' => 'Validation failed',
                    'errors' => $validator->errors()
                ], 422);
            }

            // Check if donation with same name exists
            $exists = DonationMaster::where('name', $request->name)
                ->whereNull('deleted_at')
                ->exists();

            if ($exists) {
                return response()->json([
                    'success' => false,
                    'message' => 'Donation with this name already exists'
                ], 422);
            }

            DB::beginTransaction();

            $donation = new DonationMaster();
            $donation->name = $request->name;
            $donation->type = $request->type;
            $donation->details = $request->details;
            $donation->status = $request->get('status', 1);
            $donation->created_by = Auth::id();
            $donation->save();

            DB::commit();

            return response()->json([
                'success' => true,
                'message' => 'Donation master created successfully',
                'data' => $donation
            ], 201);
        } catch (\Exception $e) {
            DB::rollBack();
            return response()->json([
                'success' => false,
                'message' => 'Failed to create donation master',
                'error' => $e->getMessage()
            ], 500);
        }
    }

    /**
     * Update donation master
     */
    public function update(Request $request, $id)
    {
        if (!Auth::user()->hasRole(['super_admin', 'admin'])) {
            return response()->json([
                'success' => false,
                'message' => 'You do not have permission to edit donation masters'
            ], 403);
        }

        try {
            $donation = DonationMaster::whereNull('deleted_at')->find($id);

            if (!$donation) {
                return response()->json([
                    'success' => false,
                    'message' => 'Donation master not found'
                ], 404);
            }

            // Validate request
            $validator = Validator::make($request->all(), [
                'name' => 'string|max:300',
                'type' => 'string|max:50',  // ← Changed from enum to string
                'details' => 'nullable|string',
                'status' => 'integer|in:0,1'
            ]);

            if ($validator->fails()) {
                return response()->json([
                    'success' => false,
                    'message' => 'Validation failed',
                    'errors' => $validator->errors()
                ], 422);
            }

            // Check if donation with same name exists (excluding current)
            if ($request->has('name')) {
                $exists = DonationMaster::where('name', $request->name)
                    ->where('id', '!=', $id)
                    ->whereNull('deleted_at')
                    ->exists();

                if ($exists) {
                    return response()->json([
                        'success' => false,
                        'message' => 'Donation with this name already exists'
                    ], 422);
                }
            }

            DB::beginTransaction();

            if ($request->has('name')) $donation->name = $request->name;
            if ($request->has('type')) $donation->type = $request->type;
            if ($request->has('details')) $donation->details = $request->details;
            if ($request->has('status')) $donation->status = $request->status;
            $donation->updated_by = Auth::id();

            $donation->save();

            DB::commit();

            return response()->json([
                'success' => true,
                'message' => 'Donation master updated successfully',
                'data' => $donation
            ]);
        } catch (\Exception $e) {
            DB::rollBack();
            return response()->json([
                'success' => false,
                'message' => 'Failed to update donation master',
                'error' => $e->getMessage()
            ], 500);
        }
    }

    /**
     * Delete donation master (soft delete)
     */
    /**
     * Delete donation master (soft delete)
     */
    public function destroy($id)
    {
        if (!Auth::user()->hasRole(['super_admin', 'admin'])) {
            return response()->json([
                'success' => false,
                'message' => 'You do not have permission to delete donation masters'
            ], 403);
        }

        try {
            $donation = DonationMaster::whereNull('deleted_at')->find($id);

            if (!$donation) {
                return response()->json([
                    'success' => false,
                    'message' => 'Donation master not found'
                ], 404);
            }

            // REMOVED: Check if donation is being used
            // Since 'donations' table doesn't exist yet, comment this out
            /*
        $inUse = DB::table('donations')
            ->where('donation_type_id', $id)
            ->whereNull('deleted_at')
            ->exists();

        if ($inUse) {
            return response()->json([
                'success' => false,
                'message' => 'Cannot delete donation master as it is being used in transactions'
            ], 422);
        }
        */

            DB::beginTransaction();

            $donation->deleted_at = now();
            $donation->deleted_by = Auth::id();
            $donation->save();

            DB::commit();

            return response()->json([
                'success' => true,
                'message' => 'Donation master deleted successfully'
            ]);
        } catch (\Exception $e) {
            DB::rollBack();
            return response()->json([
                'success' => false,
                'message' => 'Failed to delete donation master',
                'error' => $e->getMessage()
            ], 500);
        }
    }

    /**
     * Get active donations for dropdown
     */
    public function getActiveDonations(Request $request)
    {
        try {
            $query = DonationMaster::where('status', 1)
                ->whereNull('deleted_at');

            // Filter by type if provided
            if ($request->has('type')) {
                $query->where('type', $request->type);
            }

            $donations = $query->orderBy('name')
                ->get(['id', 'name', 'type', 'details']);

            return response()->json([
                'success' => true,
                'data' => $donations
            ]);
        } catch (\Exception $e) {
            return response()->json([
                'success' => false,
                'message' => 'Failed to fetch active donations',
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
        // Check if user has admin role
        $hasAdminRole = $user->hasRole(['super_admin', 'admin']);

        $permissions = [
            'can_create_donation_masters' => $hasAdminRole,
            'can_edit_donation_masters' => $hasAdminRole,
            'can_delete_donation_masters' => $hasAdminRole,
            'can_view_donation_masters' => true,
        ];

        return $permissions;
    }
}
