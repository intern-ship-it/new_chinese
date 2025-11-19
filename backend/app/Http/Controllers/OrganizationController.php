<?php

namespace App\Http\Controllers;

use App\Models\OrganizationPosition;
use App\Models\OrganizationPositionHolder;
use App\Models\OrganizationPositionHistory;
use App\Models\User;
use App\Models\Role;
use App\Traits\ApiResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Validator;
use Carbon\Carbon;

class OrganizationController extends Controller
{
    use ApiResponse;

    /**
     * Get all organization positions with current holders
     */
    public function getPositions(Request $request)
    {
        try {
            $positions = OrganizationPosition::with(['currentHolders.user', 'role'])
                ->orderBy('hierarchy_level')
                ->get()
                ->map(function ($position) {
                    return [
                        'id' => $position->id,
                        'name' => $position->name,
                        'display_name' => $position->display_name,
                        'description' => $position->description,
                        'hierarchy_level' => $position->hierarchy_level,
                        'is_default' => $position->is_default,
                        'is_deletable' => $position->is_deletable,
                        'max_holders' => $position->max_holders,
                        'current_holders' => $position->currentHolders->map(function ($holder) {
                            return [
                                'id' => $holder->id,
                                'user' => [
                                    'id' => $holder->user->id,
                                    'name' => $holder->user->name,
                                    'email' => $holder->user->email,
                                    'mobile_no' => $holder->user->mobile_no,
                                    'member_code' => $holder->user->memberDetail->member_code ?? null
                                ],
                                'term_start_date' => $holder->term_start_date,
                                'term_end_date' => $holder->term_end_date,
                                'appointed_by' => $holder->appointedBy ? $holder->appointedBy->name : null
                            ];
                        })
                    ];
                });

            return $this->successResponse($positions, 'Organization positions retrieved successfully');
        } catch (\Exception $e) {
            return $this->errorResponse('Failed to retrieve organization positions: ' . $e->getMessage());
        }
    }

    /**
     * Create a new organization position (Super Admin/Admin only)
     */
    public function createPosition(Request $request)
    {
        // Check permissions
        $user = auth()->user();
        if (!in_array($user->user_type, ['SUPER_ADMIN', 'ADMIN'])) {
            return $this->forbiddenResponse('You do not have permission to create positions');
        }

        $validator = Validator::make($request->all(), [
            'name' => 'required|string|unique:organization_positions,name',
            'display_name' => 'required|string',
            'description' => 'nullable|string',
            'hierarchy_level' => 'required|integer|min:6', // Default positions use 1-5
            'max_holders' => 'integer|min:1|max:10'
        ]);

        if ($validator->fails()) {
            return $this->validationErrorResponse($validator->errors());
        }

        DB::beginTransaction();
        try {
            // Create associated role
            $role = Role::create([
                'name' => 'org_' . strtolower(str_replace(' ', '_', $request->name)),
                'display_name' => 'Organization ' . $request->display_name,
                'description' => 'Role for ' . $request->display_name,
                'is_system' => false
            ]);

            // Create position
            $position = OrganizationPosition::create([
                'name' => strtolower(str_replace(' ', '_', $request->name)),
                'display_name' => $request->display_name,
                'description' => $request->description,
                'hierarchy_level' => $request->hierarchy_level,
                'max_holders' => $request->max_holders ?? 1,
                'role_id' => $role->id,
                'is_default' => false,
                'is_deletable' => true,
                'created_by' => $user->id
            ]);

            DB::commit();
            return $this->successResponse($position, 'Position created successfully');
        } catch (\Exception $e) {
            DB::rollBack();
            return $this->errorResponse('Failed to create position: ' . $e->getMessage());
        }
    }

    /**
     * Delete a custom organization position (Super Admin/Admin only)
     */
    public function deletePosition(Request $request, $id)
    {
        $user = auth()->user();
        if (!in_array($user->user_type, ['SUPER_ADMIN', 'ADMIN'])) {
            return $this->forbiddenResponse('You do not have permission to delete positions');
        }

        $position = OrganizationPosition::find($id);
        if (!$position) {
            return $this->notFoundResponse('Position not found');
        }

        if (!$position->is_deletable) {
            return $this->forbiddenResponse('Default positions cannot be deleted');
        }

        // Check if position has current holders
        if ($position->currentHolders()->exists()) {
            return $this->errorResponse('Cannot delete position with current holders. Please remove holders first.');
        }

        DB::beginTransaction();
        try {
            // Delete associated role
            if ($position->role) {
                $position->role->delete();
            }

            $position->delete();
            
            DB::commit();
            return $this->successResponse(null, 'Position deleted successfully');
        } catch (\Exception $e) {
            DB::rollBack();
            return $this->errorResponse('Failed to delete position: ' . $e->getMessage());
        }
    }

    /**
     * Assign a member to an organization position (Super Admin only)
     */
    public function assignPosition(Request $request)
    {
        $user = auth()->user();
        if ($user->user_type !== 'SUPER_ADMIN') {
            return $this->forbiddenResponse('Only Super Admin can assign organization positions');
        }

        $validator = Validator::make($request->all(), [
            'position_id' => 'required|uuid|exists:organization_positions,id',
            'user_id' => 'required|uuid|exists:users,id',
            'term_start_date' => 'required|date',
            'term_end_date' => 'required|date|after:term_start_date',
            'appointment_reason' => 'nullable|string'
        ]);

        if ($validator->fails()) {
            return $this->validationErrorResponse($validator->errors());
        }

        // Verify user is a member
        $member = User::where('id', $request->user_id)
            ->where('user_type', 'MEMBER')
            ->first();

        if (!$member) {
            return $this->errorResponse('Only members can be assigned to organization positions');
        }

        $position = OrganizationPosition::find($request->position_id);

        // Check max holders
        $currentHolders = $position->currentHolders()->count();
        if ($currentHolders >= $position->max_holders) {
            return $this->errorResponse("This position already has the maximum number of holders ({$position->max_holders})");
        }

        DB::beginTransaction();
        try {
            // Check if user already holds this position
            $existingHolder = OrganizationPositionHolder::where('user_id', $request->user_id)
                ->where('position_id', $request->position_id)
                ->where('is_current', true)
                ->first();

            if ($existingHolder) {
                return $this->errorResponse('User already holds this position');
            }

            // Remove user from any other position
            $oldPosition = OrganizationPositionHolder::where('user_id', $request->user_id)
                ->where('is_current', true)
                ->first();

            if ($oldPosition) {
                $oldPosition->update([
                    'is_current' => false,
                    'term_end_date' => Carbon::now()->format('Y-m-d')
                ]);

                // Log removal
                OrganizationPositionHistory::create([
                    'position_id' => $oldPosition->position_id,
                    'user_id' => $request->user_id,
                    'action' => 'REMOVED',
                    'action_by' => $user->id,
                    'reason' => 'Assigned to new position'
                ]);
            }

            // Create new position holder
            $holder = OrganizationPositionHolder::create([
                'position_id' => $request->position_id,
                'user_id' => $request->user_id,
                'term_start_date' => $request->term_start_date,
                'term_end_date' => $request->term_end_date,
                'appointed_by' => $user->id,
                'appointment_reason' => $request->appointment_reason,
                'is_current' => true
            ]);

            // Log appointment
            OrganizationPositionHistory::create([
                'position_id' => $request->position_id,
                'user_id' => $request->user_id,
                'action' => 'APPOINTED',
                'action_by' => $user->id,
                'term_start_date' => $request->term_start_date,
                'term_end_date' => $request->term_end_date,
                'reason' => $request->appointment_reason
            ]);

            // Update user role
            DB::table('model_has_roles')
                ->where('model_id', $request->user_id)
                ->delete();

            if ($position->role_id) {
                DB::table('model_has_roles')->insert([
                    'role_id' => $position->role_id,
                    'model_id' => $request->user_id,
                    'model_type' => 'App\Models\User'
                ]);
            }

            DB::commit();

            return $this->successResponse([
                'holder' => $holder,
                'position' => $position->display_name,
                'member' => $member->name
            ], 'Position assigned successfully');
        } catch (\Exception $e) {
            DB::rollBack();
            return $this->errorResponse('Failed to assign position: ' . $e->getMessage());
        }
    }

    /**
     * Remove a member from an organization position (Super Admin only)
     */
    public function removePosition(Request $request)
    {
        $user = auth()->user();
        if ($user->user_type !== 'SUPER_ADMIN') {
            return $this->forbiddenResponse('Only Super Admin can remove organization positions');
        }

        $validator = Validator::make($request->all(), [
            'user_id' => 'required|uuid|exists:users,id',
            'reason' => 'required|string'
        ]);

        if ($validator->fails()) {
            return $this->validationErrorResponse($validator->errors());
        }

        $holder = OrganizationPositionHolder::where('user_id', $request->user_id)
            ->where('is_current', true)
            ->first();

        if (!$holder) {
            return $this->notFoundResponse('User does not hold any current position');
        }

        DB::beginTransaction();
        try {
            // End current position
            $holder->update([
                'is_current' => false,
                'term_end_date' => Carbon::now()->format('Y-m-d')
            ]);

            // Log removal
            OrganizationPositionHistory::create([
                'position_id' => $holder->position_id,
                'user_id' => $request->user_id,
                'action' => 'REMOVED',
                'action_by' => $user->id,
                'reason' => $request->reason
            ]);

            // Revert to member role
            $memberRole = Role::where('name', 'member')->first();
            
            DB::table('model_has_roles')
                ->where('model_id', $request->user_id)
                ->delete();

            if ($memberRole) {
                DB::table('model_has_roles')->insert([
                    'role_id' => $memberRole->id,
                    'model_id' => $request->user_id,
                    'model_type' => 'App\Models\User'
                ]);
            }

            DB::commit();

            return $this->successResponse(null, 'Position removed successfully');
        } catch (\Exception $e) {
            DB::rollBack();
            return $this->errorResponse('Failed to remove position: ' . $e->getMessage());
        }
    }

    /**
     * Get organization position history
     */
    public function getPositionHistory(Request $request)
    {
        $query = OrganizationPositionHistory::with(['position', 'user', 'actionBy'])
            ->orderBy('action_date', 'desc');

        // Filter by position if provided
        if ($request->has('position_id')) {
            $query->where('position_id', $request->position_id);
        }

        // Filter by user if provided
        if ($request->has('user_id')) {
            $query->where('user_id', $request->user_id);
        }

        // Filter by date range
        if ($request->has('from_date')) {
            $query->where('action_date', '>=', $request->from_date);
        }
        if ($request->has('to_date')) {
            $query->where('action_date', '<=', $request->to_date);
        }

        $history = $query->paginate($request->per_page ?? 20);

        return $this->successResponse($history, 'Position history retrieved successfully');
    }

    /**
     * Get available members for position assignment
     */
    public function getAvailableMembers(Request $request)
    {
        // Get members who are not currently holding any position
        $members = User::where('user_type', 'MEMBER')
            ->where('is_active', true)
            ->whereNotIn('id', function($query) {
                $query->select('user_id')
                    ->from('organization_position_holders')
                    ->where('is_current', true);
            })
            ->with('memberDetail')
            ->select('id', 'name', 'email', 'mobile_no')
            ->get()
            ->map(function($member) {
                return [
                    'id' => $member->id,
                    'name' => $member->name,
                    'email' => $member->email,
                    'mobile_no' => $member->mobile_no,
                    'member_code' => $member->memberDetail->member_code ?? null,
                    'member_type' => $member->memberDetail->memberType->display_name ?? 'Normal Member'
                ];
            });

        return $this->successResponse($members, 'Available members retrieved successfully');
    }

    /**
     * Get organization chart/structure
     */
    public function getOrganizationChart(Request $request)
    {
        $structure = DB::table('current_organization_structure')
            ->orderBy('hierarchy_level')
            ->get()
            ->map(function($item) {
                return [
                    'position' => $item->position_title,
                    'level' => $item->hierarchy_level,
                    'member' => $item->member_name ? [
                        'name' => $item->member_name,
                        'email' => $item->member_email,
                        'phone' => $item->member_phone,
                        'term_start' => $item->term_start_date,
                        'term_end' => $item->term_end_date
                    ] : null
                ];
            });

        return $this->successResponse($structure, 'Organization chart retrieved successfully');
    }
}