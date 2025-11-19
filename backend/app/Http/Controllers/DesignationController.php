<?php
// app/Http/Controllers/DesignationController.php

namespace App\Http\Controllers;

use App\Models\Designation;
use App\Models\Role;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Validator;

class DesignationController extends Controller
{
    public function index(Request $request)
    {
        try {
            $query = Designation::with(['role', 'parentDesignation']);

            // Filters
            if ($request->has('department')) {
                $query->where('department', $request->department);
            }

            if ($request->has('is_active')) {
                $query->where('is_active', $request->boolean('is_active'));
            }

            if ($request->has('search')) {
                $search = $request->search;
                $query->where(function ($q) use ($search) {
                    $q->where('designation_name', 'like', "%{$search}%")
                      ->orWhere('designation_code', 'like', "%{$search}%");
                });
            }

            // Sorting
            $sortBy = $request->get('sort_by', 'level');
            $sortOrder = $request->get('sort_order', 'asc');
            $query->orderBy($sortBy, $sortOrder);

            $designations = $request->has('all') 
                ? $query->get() 
                : $query->paginate($request->get('per_page', 15));

            return response()->json([
                'success' => true,
                'data' => $designations,
                'message' => 'Designations retrieved successfully'
            ]);
        } catch (\Exception $e) {
            return response()->json([
                'success' => false,
                'message' => 'Error retrieving designations: ' . $e->getMessage()
            ], 500);
        }
    }

    public function store(Request $request)
    {
        $validator = Validator::make($request->all(), [
            'designation_name' => 'required|string|max:100',
            'department' => 'required|in:ADMINISTRATION,RELIGIOUS,FINANCE,OPERATIONS,MAINTENANCE,SECURITY,IT,HR,MARKETING,OTHER',
            'level' => 'required|integer|min:1|max:10',
            'role_id' => 'nullable|exists:roles,id',
            'parent_designation_id' => 'nullable|exists:designations,id',
            'can_approve_leave' => 'boolean',
            'can_approve_payments' => 'boolean',
            'can_approve_bookings' => 'boolean',
            'is_head_of_department' => 'boolean',
            'max_leave_approval_days' => 'nullable|integer|min:1',
            'max_payment_approval_amount' => 'nullable|numeric|min:0',
            'description' => 'nullable|string'
        ]);

        if ($validator->fails()) {
            return response()->json([
                'success' => false,
                'message' => 'Validation failed',
                'errors' => $validator->errors()
            ], 422);
        }

        DB::beginTransaction();
        try {
            $data = $request->all();
            
            // Generate designation code if not provided
            if (!isset($data['designation_code'])) {
                $data['designation_code'] = Designation::generateDesignationCode($data['department']);
            }

            $designation = Designation::create($data);

            DB::commit();

            return response()->json([
                'success' => true,
                'data' => $designation->load(['role', 'parentDesignation']),
                'message' => 'Designation created successfully'
            ], 201);
        } catch (\Exception $e) {
            DB::rollBack();
            return response()->json([
                'success' => false,
                'message' => 'Error creating designation: ' . $e->getMessage()
            ], 500);
        }
    }

    public function show($id)
    {
        try {
            $designation = Designation::with([
                'role',
                'parentDesignation',
                'childDesignations',
                'staff' => function ($q) {
                    $q->where('status', 'ACTIVE');
                }
            ])->findOrFail($id);

            return response()->json([
                'success' => true,
                'data' => $designation,
                'message' => 'Designation retrieved successfully'
            ]);
        } catch (\Exception $e) {
            return response()->json([
                'success' => false,
                'message' => 'Designation not found'
            ], 404);
        }
    }

    public function update(Request $request, $id)
    {
        $validator = Validator::make($request->all(), [
            'designation_name' => 'string|max:100',
            'department' => 'in:ADMINISTRATION,RELIGIOUS,FINANCE,OPERATIONS,MAINTENANCE,SECURITY,IT,HR,MARKETING,OTHER',
            'level' => 'integer|min:1|max:10',
            'role_id' => 'nullable|exists:roles,id',
            'parent_designation_id' => 'nullable|exists:designations,id|not_in:' . $id,
            'can_approve_leave' => 'boolean',
            'can_approve_payments' => 'boolean',
            'can_approve_bookings' => 'boolean',
            'is_head_of_department' => 'boolean',
            'max_leave_approval_days' => 'nullable|integer|min:1',
            'max_payment_approval_amount' => 'nullable|numeric|min:0',
            'is_active' => 'boolean',
            'description' => 'nullable|string'
        ]);

        if ($validator->fails()) {
            return response()->json([
                'success' => false,
                'message' => 'Validation failed',
                'errors' => $validator->errors()
            ], 422);
        }

        DB::beginTransaction();
        try {
            $designation = Designation::findOrFail($id);
            $oldRoleId = $designation->role_id;
            
            $designation->update($request->all());

            // If role changed, update all staff users
            if ($oldRoleId != $designation->role_id) {
                foreach ($designation->staff as $staff) {
                    $staff->updateUserRole();
                }
            }

            DB::commit();

            return response()->json([
                'success' => true,
                'data' => $designation->load(['role', 'parentDesignation']),
                'message' => 'Designation updated successfully'
            ]);
        } catch (\Exception $e) {
            DB::rollBack();
            return response()->json([
                'success' => false,
                'message' => 'Error updating designation: ' . $e->getMessage()
            ], 500);
        }
    }

    public function destroy($id)
    {
        DB::beginTransaction();
        try {
            $designation = Designation::findOrFail($id);

            // Check if designation has active staff
            if ($designation->staff()->where('status', 'ACTIVE')->exists()) {
                return response()->json([
                    'success' => false,
                    'message' => 'Cannot delete designation with active staff'
                ], 400);
            }

            // Soft delete instead of hard delete
            $designation->update(['is_active' => false]);

            DB::commit();

            return response()->json([
                'success' => true,
                'message' => 'Designation deactivated successfully'
            ]);
        } catch (\Exception $e) {
            DB::rollBack();
            return response()->json([
                'success' => false,
                'message' => 'Error deleting designation: ' . $e->getMessage()
            ], 500);
        }
    }

    public function getHierarchy()
    {
        try {
            $designations = Designation::with(['role', 'childDesignations'])
                ->whereNull('parent_designation_id')
                ->active()
                ->get();

            $hierarchy = $this->buildHierarchyTree($designations);

            return response()->json([
                'success' => true,
                'data' => $hierarchy,
                'message' => 'Designation hierarchy retrieved successfully'
            ]);
        } catch (\Exception $e) {
            return response()->json([
                'success' => false,
                'message' => 'Error retrieving hierarchy: ' . $e->getMessage()
            ], 500);
        }
    }

    private function buildHierarchyTree($designations)
    {
        $tree = [];
        
        foreach ($designations as $designation) {
            $node = [
                'id' => $designation->id,
                'name' => $designation->designation_name,
                'code' => $designation->designation_code,
                'department' => $designation->department,
                'level' => $designation->level,
                'role' => $designation->role ? $designation->role->display_name : null,
                'children' => []
            ];

            if ($designation->childDesignations->count() > 0) {
                $node['children'] = $this->buildHierarchyTree($designation->childDesignations);
            }

            $tree[] = $node;
        }

        return $tree;
    }

    public function getRoles()
    {
        try {
            $roles = Role::select('id', 'name', 'display_name')
                ->where('is_system', false) // Exclude system roles if needed
                ->orderBy('display_name')
                ->get();

            return response()->json([
                'success' => true,
                'data' => $roles,
                'message' => 'Roles retrieved successfully'
            ]);
        } catch (\Exception $e) {
            return response()->json([
                'success' => false,
                'message' => 'Error retrieving roles: ' . $e->getMessage()
            ], 500);
        }
    }
}