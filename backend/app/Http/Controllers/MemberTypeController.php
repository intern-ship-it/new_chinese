<?php

namespace App\Http\Controllers;

use App\Models\MemberType;
use App\Models\MemberDetail;
use App\Models\MemberSubscription;
use App\Models\User;
use App\Traits\ApiResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Validator;
use Carbon\Carbon;

class MemberTypeController extends Controller
{
    use ApiResponse;

    /**
     * Get all member types
     */
    public function getMemberTypes(Request $request)
    {
        try {
            $memberTypes = MemberType::where('is_active', true)
                ->orderBy('priority_level', 'desc')
                ->get()
                ->map(function ($type) {
                    return [
                        'id' => $type->id,
                        'name' => $type->name,
                        'display_name' => $type->display_name,
                        'description' => $type->description,
                        'is_paid' => $type->is_paid,
                        'subscription_amount' => $type->subscription_amount,
                        'subscription_period' => $type->subscription_period,
                        'benefits' => $type->benefits,
                        'restrictions' => $type->restrictions,
                        'priority_level' => $type->priority_level,
                        'is_default' => $type->is_default,
                        'is_deletable' => $type->is_deletable,
                        'member_count' => MemberDetail::where('member_type_id', $type->id)->count()
                    ];
                });

            return $this->successResponse($memberTypes, 'Member types retrieved successfully');
        } catch (\Exception $e) {
            return $this->errorResponse('Failed to retrieve member types: ' . $e->getMessage());
        }
    }

    /**
     * Create a new member type (Super Admin/Admin only)
     */
    public function createMemberType(Request $request)
    {
        $user = auth()->user();
        if (!in_array($user->user_type, ['SUPER_ADMIN', 'ADMIN'])) {
            return $this->forbiddenResponse('You do not have permission to create member types');
        }

        $validator = Validator::make($request->all(), [
            'name' => 'required|string|unique:member_types,name',
            'display_name' => 'required|string',
            'description' => 'nullable|string',
            'is_paid' => 'required|boolean',
            'subscription_amount' => 'required_if:is_paid,true|nullable|numeric|min:0',
            'subscription_period' => 'nullable|integer|min:1', // in months, null for lifetime
            'benefits' => 'nullable|array',
            'restrictions' => 'nullable|array',
            'priority_level' => 'integer|min:0|max:100'
        ]);

        if ($validator->fails()) {
            return $this->validationErrorResponse($validator->errors());
        }

        try {
            $memberType = MemberType::create([
                'name' => strtolower(str_replace(' ', '_', $request->name)),
                'display_name' => $request->display_name,
                'description' => $request->description,
                'is_paid' => $request->is_paid,
                'subscription_amount' => $request->is_paid ? $request->subscription_amount : null,
                'subscription_period' => $request->subscription_period,
                'benefits' => $request->benefits ?? [],
                'restrictions' => $request->restrictions ?? [],
                'priority_level' => $request->priority_level ?? 0,
                'is_default' => false,
                'is_deletable' => true,
                'created_by' => $user->id
            ]);

            return $this->successResponse($memberType, 'Member type created successfully');
        } catch (\Exception $e) {
            return $this->errorResponse('Failed to create member type: ' . $e->getMessage());
        }
    }

    /**
     * Update a member type (Super Admin/Admin only)
     */
    public function updateMemberType(Request $request, $id)
    {
        $user = auth()->user();
        if (!in_array($user->user_type, ['SUPER_ADMIN', 'ADMIN'])) {
            return $this->forbiddenResponse('You do not have permission to update member types');
        }

        $memberType = MemberType::find($id);
        if (!$memberType) {
            return $this->notFoundResponse('Member type not found');
        }

        if ($memberType->is_default) {
            return $this->forbiddenResponse('Default member type cannot be modified');
        }

        $validator = Validator::make($request->all(), [
            'display_name' => 'string',
            'description' => 'nullable|string',
            'is_paid' => 'boolean',
            'subscription_amount' => 'required_if:is_paid,true|nullable|numeric|min:0',
            'subscription_period' => 'nullable|integer|min:1',
            'benefits' => 'nullable|array',
            'restrictions' => 'nullable|array',
            'priority_level' => 'integer|min:0|max:100'
        ]);

        if ($validator->fails()) {
            return $this->validationErrorResponse($validator->errors());
        }

        try {
            $memberType->update([
                'display_name' => $request->display_name ?? $memberType->display_name,
                'description' => $request->description ?? $memberType->description,
                'is_paid' => $request->is_paid ?? $memberType->is_paid,
                'subscription_amount' => $request->has('subscription_amount') ? $request->subscription_amount : $memberType->subscription_amount,
                'subscription_period' => $request->has('subscription_period') ? $request->subscription_period : $memberType->subscription_period,
                'benefits' => $request->benefits ?? $memberType->benefits,
                'restrictions' => $request->restrictions ?? $memberType->restrictions,
                'priority_level' => $request->priority_level ?? $memberType->priority_level,
                'updated_by' => $user->id
            ]);

            return $this->successResponse($memberType, 'Member type updated successfully');
        } catch (\Exception $e) {
            return $this->errorResponse('Failed to update member type: ' . $e->getMessage());
        }
    }

    /**
     * Delete a member type (Super Admin/Admin only)
     */
    public function deleteMemberType(Request $request, $id)
    {
        $user = auth()->user();
        if (!in_array($user->user_type, ['SUPER_ADMIN', 'ADMIN'])) {
            return $this->forbiddenResponse('You do not have permission to delete member types');
        }

        $memberType = MemberType::find($id);
        if (!$memberType) {
            return $this->notFoundResponse('Member type not found');
        }

        if (!$memberType->is_deletable) {
            return $this->forbiddenResponse('This member type cannot be deleted');
        }

        // Check if any members have this type
        $memberCount = MemberDetail::where('member_type_id', $id)->count();
        if ($memberCount > 0) {
            return $this->errorResponse("Cannot delete member type. {$memberCount} members are using this type.");
        }

        try {
            $memberType->delete();
            return $this->successResponse(null, 'Member type deleted successfully');
        } catch (\Exception $e) {
            return $this->errorResponse('Failed to delete member type: ' . $e->getMessage());
        }
    }

    /**
     * Assign member type to a member
     */
    public function assignMemberType(Request $request)
    {
        $validator = Validator::make($request->all(), [
            'user_id' => 'required|uuid|exists:users,id',
            'member_type_id' => 'required|uuid|exists:member_types,id',
            'payment_reference' => 'nullable|string',
            'payment_date' => 'nullable|date'
        ]);

        if ($validator->fails()) {
            return $this->validationErrorResponse($validator->errors());
        }

        $user = User::find($request->user_id);
        if ($user->user_type !== 'MEMBER') {
            return $this->errorResponse('Member type can only be assigned to members');
        }

        $memberType = MemberType::find($request->member_type_id);
        $memberDetail = MemberDetail::where('user_id', $request->user_id)->first();

        if (!$memberDetail) {
            return $this->errorResponse('Member details not found');
        }

        DB::beginTransaction();
        try {
            $startDate = Carbon::now();
            $endDate = null;

            if ($memberType->subscription_period) {
                $endDate = $startDate->copy()->addMonths($memberType->subscription_period);
            }

            // Update member detail
            $memberDetail->update([
                'member_type_id' => $memberType->id,
                'subscription_start_date' => $startDate->format('Y-m-d'),
                'subscription_end_date' => $endDate ? $endDate->format('Y-m-d') : null,
                'subscription_status' => 'ACTIVE'
            ]);

            // Create subscription record if paid
            if ($memberType->is_paid) {
                MemberSubscription::create([
                    'user_id' => $request->user_id,
                    'member_type_id' => $memberType->id,
                    'start_date' => $startDate->format('Y-m-d'),
                    'end_date' => $endDate ? $endDate->format('Y-m-d') : null,
                    'amount_paid' => $memberType->subscription_amount,
                    'payment_reference' => $request->payment_reference,
                    'payment_date' => $request->payment_date ?? now(),
                    'status' => 'ACTIVE',
                    'created_by' => auth()->id()
                ]);
            }

            DB::commit();

            return $this->successResponse([
                'member' => $user->name,
                'member_type' => $memberType->display_name,
                'subscription_start' => $startDate->format('Y-m-d'),
                'subscription_end' => $endDate ? $endDate->format('Y-m-d') : 'Lifetime'
            ], 'Member type assigned successfully');
        } catch (\Exception $e) {
            DB::rollBack();
            return $this->errorResponse('Failed to assign member type: ' . $e->getMessage());
        }
    }

    /**
     * Get member subscriptions
     */
    public function getMemberSubscriptions(Request $request)
    {
        $query = MemberSubscription::with(['user', 'memberType', 'createdBy']);

        // Filter by user
        if ($request->has('user_id')) {
            $query->where('user_id', $request->user_id);
        }

        // Filter by status
        if ($request->has('status')) {
            $query->where('status', $request->status);
        }

        // Filter by member type
        if ($request->has('member_type_id')) {
            $query->where('member_type_id', $request->member_type_id);
        }

        // Filter by date range
        if ($request->has('from_date')) {
            $query->where('start_date', '>=', $request->from_date);
        }
        if ($request->has('to_date')) {
            $query->where('end_date', '<=', $request->to_date);
        }

        $subscriptions = $query->orderBy('created_at', 'desc')
            ->paginate($request->per_page ?? 20);

        return $this->successResponse($subscriptions, 'Subscriptions retrieved successfully');
    }

    /**
     * Renew member subscription
     */
    public function renewSubscription(Request $request)
    {
        $validator = Validator::make($request->all(), [
            'user_id' => 'required|uuid|exists:users,id',
            'payment_reference' => 'required|string',
            'payment_date' => 'required|date'
        ]);

        if ($validator->fails()) {
            return $this->validationErrorResponse($validator->errors());
        }

        $memberDetail = MemberDetail::where('user_id', $request->user_id)->first();
        if (!$memberDetail || !$memberDetail->member_type_id) {
            return $this->errorResponse('Member type not found for this user');
        }

        $memberType = MemberType::find($memberDetail->member_type_id);
        if (!$memberType->is_paid) {
            return $this->errorResponse('This member type does not require subscription');
        }

        if (!$memberType->subscription_period) {
            return $this->errorResponse('Lifetime memberships cannot be renewed');
        }

        DB::beginTransaction();
        try {
            $startDate = Carbon::now();
            
            // If current subscription is still active, start from its end date
            if ($memberDetail->subscription_end_date && Carbon::parse($memberDetail->subscription_end_date)->isFuture()) {
                $startDate = Carbon::parse($memberDetail->subscription_end_date)->addDay();
            }
            
            $endDate = $startDate->copy()->addMonths($memberType->subscription_period);

            // Update member detail
            $memberDetail->update([
                'subscription_start_date' => $startDate->format('Y-m-d'),
                'subscription_end_date' => $endDate->format('Y-m-d'),
                'subscription_status' => 'ACTIVE'
            ]);

            // Create new subscription record
            MemberSubscription::create([
                'user_id' => $request->user_id,
                'member_type_id' => $memberType->id,
                'start_date' => $startDate->format('Y-m-d'),
                'end_date' => $endDate->format('Y-m-d'),
                'amount_paid' => $memberType->subscription_amount,
                'payment_reference' => $request->payment_reference,
                'payment_date' => $request->payment_date,
                'status' => 'ACTIVE',
                'created_by' => auth()->id()
            ]);

            DB::commit();

            return $this->successResponse([
                'subscription_start' => $startDate->format('Y-m-d'),
                'subscription_end' => $endDate->format('Y-m-d'),
                'amount_paid' => $memberType->subscription_amount
            ], 'Subscription renewed successfully');
        } catch (\Exception $e) {
            DB::rollBack();
            return $this->errorResponse('Failed to renew subscription: ' . $e->getMessage());
        }
    }

    /**
     * Get members by type
     */
    public function getMembersByType(Request $request, $typeId)
    {
        $memberType = MemberType::find($typeId);
        if (!$memberType) {
            return $this->notFoundResponse('Member type not found');
        }

        $members = User::join('member_details', 'users.id', '=', 'member_details.user_id')
            ->where('member_details.member_type_id', $typeId)
            ->where('users.user_type', 'MEMBER')
            ->select(
                'users.id',
                'users.name',
                'users.email',
                'users.mobile_no',
                'member_details.member_code',
                'member_details.subscription_start_date',
                'member_details.subscription_end_date',
                'member_details.subscription_status'
            )
            ->paginate($request->per_page ?? 20);

        return $this->successResponse([
            'member_type' => $memberType->display_name,
            'members' => $members
        ], 'Members retrieved successfully');
    }
}