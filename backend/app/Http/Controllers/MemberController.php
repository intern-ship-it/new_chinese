<?php

namespace App\Http\Controllers;

use App\Models\User;
use App\Models\MemberDetail;
use App\Models\MemberType;
use App\Models\MemberSubscription;
use App\Models\MemberSignature;
use App\Models\Role;
use App\Traits\ApiResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Hash;
use Illuminate\Support\Facades\Validator;
use Illuminate\Validation\Rule;
use App\Services\S3UploadService;
use Carbon\Carbon;
use Illuminate\Support\Str;
use Illuminate\Support\Facades\Log;

class MemberController extends Controller
{
    use ApiResponse;

    /**
     * Get all members with filters and pagination
     */
    public function getMembers(Request $request)
    {
        try {
            // Enable query log for debugging
            DB::enableQueryLog();
            
            // Start with base query
            $query = User::query();
            
            // Add base conditions
            $query->where('user_type', '=', 'MEMBER');
            
            // Add relationships
            $query->with(['memberDetail', 'memberDetail.memberType', 'memberDetail.referredBy', 'currentPosition', 'currentPosition.position']);

            // Search filters - only apply if not empty
            $search = $request->get('search');
            if (!empty($search) && $search !== '') {
                $query->where(function($q) use ($search) {
                    $q->where('name', 'LIKE', "%{$search}%")
                      ->orWhere('email', 'LIKE', "%{$search}%")
                      ->orWhere('mobile_no', 'LIKE', "%{$search}%")
                      ->orWhereHas('memberDetail', function($q) use ($search) {
                          $q->where('member_code', 'LIKE', "%{$search}%");
                      });
                });
            }

            // Filter by member type - only if not empty
            $memberTypeId = $request->get('member_type_id');
            if (!empty($memberTypeId) && $memberTypeId !== '') {
                $query->whereHas('memberDetail', function($q) use ($memberTypeId) {
                    $q->where('member_type_id', '=', $memberTypeId);
                });
            }

            // Filter by status - only if not empty
            $status = $request->get('status');
            if (!empty($status) && $status !== '') {
                if ($status === 'active') {
                    $query->where('is_active', '=', true);
                } elseif ($status === 'inactive') {
                    $query->where('is_active', '=', false);
                } elseif ($status === 'subscription_expired') {
                    $query->whereHas('memberDetail', function($q) {
                        $q->where('subscription_end_date', '<', Carbon::now())
                          ->whereHas('memberType', function($q) {
                              $q->where('is_paid', '=', true);
                          });
                    });
                }
            }

            // Filter by organization position - only if not empty
            $hasPosition = $request->get('has_position');
            if (!empty($hasPosition) && $hasPosition !== '') {
                if ($hasPosition === 'true' || $hasPosition === true || $hasPosition === '1') {
                    $query->has('currentPosition');
                } elseif ($hasPosition === 'false' || $hasPosition === false || $hasPosition === '0') {
                    $query->doesntHave('currentPosition');
                }
            }

            // Filter by date range (membership date) - only if not empty
            $fromDate = $request->get('from_date');
            if (!empty($fromDate) && $fromDate !== '') {
                $query->whereHas('memberDetail', function($q) use ($fromDate) {
                    $q->where('membership_date', '>=', $fromDate);
                });
            }
            
            $toDate = $request->get('to_date');
            if (!empty($toDate) && $toDate !== '') {
                $query->whereHas('memberDetail', function($q) use ($toDate) {
                    $q->where('membership_date', '<=', $toDate);
                });
            }

            // Sorting
            $sortBy = $request->get('sort_by', 'created_at');
            $sortOrder = $request->get('sort_order', 'desc');
            
            // Validate sort parameters
            $allowedSortFields = ['name', 'email', 'created_at', 'updated_at', 'member_code'];
            $allowedSortOrders = ['asc', 'desc'];
            
            if (!in_array($sortBy, $allowedSortFields)) {
                $sortBy = 'created_at';
            }
            
            if (!in_array(strtolower($sortOrder), $allowedSortOrders)) {
                $sortOrder = 'desc';
            }
            
            if ($sortBy === 'member_code') {
                // Use leftJoin to include members without member_details
                $query->leftJoin('member_details', 'users.id', '=', 'member_details.user_id')
                      ->orderBy('member_details.member_code', $sortOrder)
                      ->select('users.*');
            } else {
                $query->orderBy($sortBy, $sortOrder);
            }

            // Get the SQL query for debugging
            $sql = $query->toSql();
            $bindings = $query->getBindings();
            
            // Log the query
            Log::info('Members Query SQL: ' . $sql);
            Log::info('Members Query Bindings: ', $bindings);
            
            // Build full query string for debugging
            $fullQuery = $sql;
            foreach ($bindings as $binding) {
                $value = is_numeric($binding) ? $binding : "'{$binding}'";
                $fullQuery = preg_replace('/\?/', $value, $fullQuery, 1);
            }
            
            // Also return in response for debugging (remove in production)
            $debugQuery = [
                'sql' => $sql,
                'bindings' => $bindings,
                'full_query' => $fullQuery
            ];

            // Pagination
            $perPage = intval($request->get('per_page', 20));
            $perPage = min(max($perPage, 1), 100); // Ensure between 1 and 100
            
            try {
                // Execute pagination
                $members = $query->paginate($perPage);
                
                // Get executed queries
                $queries = DB::getQueryLog();
                Log::info('Executed Queries: ', $queries);
                
                // Transform the response
                $members->getCollection()->transform(function ($member) {
                    return $this->transformMember($member);
                });

                // Return response without debug in production
                $responseData = $members;
                
                // Add debug info in development (remove in production)
                if (config('app.debug', false)) {
                    return $this->successResponse([
                        'data' => $members,
                        'debug' => [
                            'query' => $debugQuery,
                            'executed_queries' => $queries,
                            'request_params' => $request->all(),
                            'cleaned_params' => [
                                'search' => $search,
                                'member_type_id' => $memberTypeId,
                                'status' => $status,
                                'has_position' => $hasPosition,
                                'from_date' => $fromDate,
                                'to_date' => $toDate,
                                'sort_by' => $sortBy,
                                'sort_order' => $sortOrder,
                                'per_page' => $perPage
                            ]
                        ]
                    ], 'Members retrieved successfully');
                }
                
                return $this->successResponse($members, 'Members retrieved successfully');
                
            } catch (\Exception $e) {
                Log::error('Pagination Error: ' . $e->getMessage());
                Log::error('Stack Trace: ' . $e->getTraceAsString());
                
                // Return detailed error for debugging
                return $this->errorResponse('Pagination failed: ' . $e->getMessage() . ' | Query: ' . $fullQuery);
            }
            
        } catch (\Exception $e) {
            Log::error('Failed to retrieve members: ' . $e->getMessage());
            Log::error('Stack Trace: ' . $e->getTraceAsString());
            
            // Get any executed queries before error
            $queries = DB::getQueryLog();
            Log::error('Queries before error: ', $queries);
            
            return $this->errorResponse('Failed to retrieve members: ' . $e->getMessage());
        } finally {
            // Disable query log
            DB::disableQueryLog();
        }
    }

    /**
     * Get single member details
     */
    public function getMember($id)
    {
        try {
            $member = User::where('id', $id)
                ->where('user_type', 'MEMBER')
                ->with([
                    'memberDetail.memberType',
                    'memberDetail.referredBy',
                    'memberDetail.familyHead',
                    'currentPosition.position',
                    'memberSubscriptions' => function($q) {
                        $q->orderBy('created_at', 'desc')->limit(5);
                    },
                    'positionHistory' => function($q) {
                        $q->orderBy('action_date', 'desc')->limit(10);
                    }
                ])
                ->first();

            if (!$member) {
                return $this->notFoundResponse('Member not found');
            }

            // Get family members if this member is a family head
            $familyMembers = [];
            if ($member->memberDetail) {
                $familyMembers = User::where('user_type', 'MEMBER')
                    ->whereHas('memberDetail', function($q) use ($member) {
                        $q->where('family_head_id', $member->id);
                    })
                    ->with('memberDetail')
                    ->get()
                    ->map(function($fm) {
                        return [
                            'id' => $fm->id,
                            'name' => $fm->name,
                            'member_code' => $fm->memberDetail->member_code ?? null,
                            'relationship' => 'Family Member'
                        ];
                    });
            }

            $memberData = $this->transformMember($member);
            $memberData['family_members'] = $familyMembers;
            $memberData['subscription_history'] = $member->memberSubscriptions;
            $memberData['position_history'] = $member->positionHistory;

            return $this->successResponse($memberData, 'Member details retrieved successfully');
        } catch (\Exception $e) {
            return $this->errorResponse('Failed to retrieve member: ' . $e->getMessage());
        }
    }

    /**
     * Create a new member
     */
    public function createMember(Request $request)
    {
        $validator = Validator::make($request->all(), [
            // User fields
            'username' => 'required|string|unique:users,username',
            'name' => 'required|string|max:255',
            'email' => 'required|email|unique:users,email',
            'password' => 'required|string|min:8',
            'mobile_code' => 'nullable|string|max:10',
            'mobile_no' => 'required|string|max:20',
            'alternate_mobile' => 'nullable|string|max:20',
            'address' => 'nullable|string',
            'city' => 'nullable|string|max:100',
            'state' => 'nullable|string|max:100',
            'country' => 'nullable|string|max:100',
            'pincode' => 'nullable|string|max:10',
            'date_of_birth' => 'nullable|date',
            'gender' => ['nullable', Rule::in(['MALE', 'FEMALE', 'OTHER'])],
            'id_proof_type' => 'nullable|string|max:50',
            'id_proof_number' => 'nullable|string|max:100',
            
            // Member details
            'member_type_id' => 'nullable|uuid|exists:member_types,id',
            'membership_date' => 'nullable|date',
            'referred_by' => 'nullable|uuid|exists:users,id',
            'family_head_id' => 'nullable|uuid|exists:users,id',
            'occupation' => 'nullable|string|max:100',
            'annual_income' => 'nullable|string|max:50',
            'qualification' => 'nullable|string|max:100',
            
            // Subscription details (if paid member type)
            'payment_reference' => 'nullable|string',
            'payment_date' => 'nullable|date'
        ]);

        if ($validator->fails()) {
            return $this->validationErrorResponse($validator->errors());
        }

        DB::beginTransaction();
        try {
            // Create user
            $user = User::create([
                'username' => $request->username,
                'name' => $request->name,
                'email' => $request->email,
                'password' => Hash::make($request->password),
                'user_type' => 'MEMBER',
                'mobile_code' => $request->mobile_code ?? '+91',
                'mobile_no' => $request->mobile_no,
                'alternate_mobile' => $request->alternate_mobile,
                'address' => $request->address,
                'city' => $request->city,
                'state' => $request->state,
                'country' => $request->country ?? 'India',
                'pincode' => $request->pincode,
                'date_of_birth' => $request->date_of_birth,
                'gender' => $request->gender,
                'id_proof_type' => $request->id_proof_type,
                'id_proof_number' => $request->id_proof_number,
                'is_active' => true,
                'is_verified' => false,
                'created_by' => auth()->id()
            ]);

            // Generate member code
            $memberCode = $this->generateMemberCode();
            
            // Get member type
            $memberTypeId = $request->member_type_id;
            if (!$memberTypeId) {
                // Get default member type (Normal Member)
                $defaultType = MemberType::where('is_default', true)->first();
                $memberTypeId = $defaultType ? $defaultType->id : null;
            }
            
            $memberType = $memberTypeId ? MemberType::find($memberTypeId) : null;
            
            // Calculate subscription dates if paid member type
            $subscriptionStartDate = null;
            $subscriptionEndDate = null;
            $subscriptionStatus = 'ACTIVE';
            
            if ($memberType && $memberType->is_paid) {
                $subscriptionStartDate = Carbon::now();
                if ($memberType->subscription_period) {
                    $subscriptionEndDate = $subscriptionStartDate->copy()->addMonths($memberType->subscription_period);
                }
            }

            // Create member details
            $memberDetail = MemberDetail::create([
                'user_id' => $user->id,
                'member_code' => $memberCode,
                'member_type_id' => $memberTypeId,
                'membership_date' => $request->membership_date ?? Carbon::now(),
                'referred_by' => $request->referred_by,
                'family_head_id' => $request->family_head_id,
                'occupation' => $request->occupation,
                'annual_income' => $request->annual_income,
                'qualification' => $request->qualification,
                'subscription_start_date' => $subscriptionStartDate,
                'subscription_end_date' => $subscriptionEndDate,
                'subscription_status' => $subscriptionStatus,
                'is_active' => true
            ]);

            // Create subscription record if paid member type
            if ($memberType && $memberType->is_paid && $request->payment_reference) {
                MemberSubscription::create([
                    'user_id' => $user->id,
                    'member_type_id' => $memberType->id,
                    'start_date' => $subscriptionStartDate,
                    'end_date' => $subscriptionEndDate,
                    'amount_paid' => $memberType->subscription_amount,
                    'payment_reference' => $request->payment_reference,
                    'payment_date' => $request->payment_date ?? now(),
                    'status' => 'ACTIVE',
                    'created_by' => auth()->id()
                ]);
            }

            // Assign member role
            $memberRole = Role::where('name', 'member')->first();
            if ($memberRole) {
                $user->assignRole($memberRole);
            }

            DB::commit();

            return $this->successResponse([
                'member' => $this->transformMember($user->load('memberDetail.memberType')),
                'member_code' => $memberCode
            ], 'Member created successfully');
        } catch (\Exception $e) {
            DB::rollBack();
            return $this->errorResponse('Failed to create member: ' . $e->getMessage());
        }
    }

    /**
     * Update member details
     */
    public function updateMember(Request $request, $id)
    {
        $member = User::where('id', $id)->where('user_type', 'MEMBER')->first();
        if (!$member) {
            return $this->notFoundResponse('Member not found');
        }

        $validator = Validator::make($request->all(), [
            'name' => 'nullable|string|max:255',
            'email' => ['nullable', 'email', Rule::unique('users')->ignore($id)],
            'mobile_code' => 'nullable|string|max:10',
            'mobile_no' => 'nullable|string|max:20',
            'alternate_mobile' => 'nullable|string|max:20',
            'address' => 'nullable|string',
            'city' => 'nullable|string|max:100',
            'state' => 'nullable|string|max:100',
            'country' => 'nullable|string|max:100',
            'pincode' => 'nullable|string|max:10',
            'date_of_birth' => 'nullable|date',
            'gender' => ['nullable', Rule::in(['MALE', 'FEMALE', 'OTHER'])],
            'id_proof_type' => 'nullable|string|max:50',
            'id_proof_number' => 'nullable|string|max:100',
            
            // Member details
            'member_type_id' => 'nullable|uuid|exists:member_types,id',
            'referred_by' => 'nullable|uuid|exists:users,id',
            'family_head_id' => 'nullable|uuid|exists:users,id',
            'occupation' => 'nullable|string|max:100',
            'annual_income' => 'nullable|string|max:50',
            'qualification' => 'nullable|string|max:100',
            'is_active' => 'nullable|boolean'
        ]);

        if ($validator->fails()) {
            return $this->validationErrorResponse($validator->errors());
        }

        DB::beginTransaction();
        try {
            // Update user fields
            $userFields = ['name', 'email', 'mobile_code', 'mobile_no', 'alternate_mobile', 
                          'address', 'city', 'state', 'country', 'pincode', 'date_of_birth', 
                          'gender', 'id_proof_type', 'id_proof_number', 'is_active'];
            
            $userUpdates = array_filter($request->only($userFields), function($value) {
                return !is_null($value);
            });
            
            if (!empty($userUpdates)) {
                $userUpdates['updated_by'] = auth()->id();
                $member->update($userUpdates);
            }

            // Update member details
            $memberDetail = $member->memberDetail;
            if ($memberDetail) {
                $detailFields = ['member_type_id', 'referred_by', 'family_head_id', 
                               'occupation', 'annual_income', 'qualification'];
                
                $detailUpdates = array_filter($request->only($detailFields), function($value) {
                    return !is_null($value);
                });
                
                if (!empty($detailUpdates)) {
                    // Handle member type change
                    if (isset($detailUpdates['member_type_id']) && 
                        $detailUpdates['member_type_id'] !== $memberDetail->member_type_id) {
                        
                        $newMemberType = MemberType::find($detailUpdates['member_type_id']);
                        if ($newMemberType) {
                            // Update subscription dates based on new member type
                            if ($newMemberType->is_paid) {
                                $detailUpdates['subscription_start_date'] = Carbon::now();
                                $detailUpdates['subscription_end_date'] = $newMemberType->subscription_period 
                                    ? Carbon::now()->addMonths($newMemberType->subscription_period)
                                    : null;
                                $detailUpdates['subscription_status'] = 'PENDING'; // Pending until payment
                            } else {
                                $detailUpdates['subscription_start_date'] = null;
                                $detailUpdates['subscription_end_date'] = null;
                                $detailUpdates['subscription_status'] = 'ACTIVE';
                            }
                        }
                    }
                    
                    $memberDetail->update($detailUpdates);
                }
            }

            DB::commit();

            return $this->successResponse(
                $this->transformMember($member->fresh(['memberDetail.memberType'])),
                'Member updated successfully'
            );
        } catch (\Exception $e) {
            DB::rollBack();
            return $this->errorResponse('Failed to update member: ' . $e->getMessage());
        }
    }

    // ... Rest of the methods remain the same ...

    /**
	 * Transform member data for response
	 */
	private function transformMember($member)
	{
		$data = [
			'id' => $member->id,
			'username' => $member->username,
			'name' => $member->name,
			'email' => $member->email,
			'mobile_code' => $member->mobile_code,
			'mobile_no' => $member->mobile_no,
			'alternate_mobile' => $member->alternate_mobile,
			'address' => $member->address,
			'city' => $member->city,
			'state' => $member->state,
			'country' => $member->country,
			'pincode' => $member->pincode,
			'date_of_birth' => $member->date_of_birth,
			'gender' => $member->gender,
			'id_proof_type' => $member->id_proof_type,
			'id_proof_number' => $member->id_proof_number,
			'is_active' => $member->is_active,
			'is_verified' => $member->is_verified,
			'last_login_at' => $member->last_login_at,
			'created_at' => $member->created_at,
			'member_details' => null,
			'current_position' => null,
			'signature_url' => null  // Add this field
		];

		// Get signature if exists
		$signature = MemberSignature::where('user_id', $member->id)->first();
		if ($signature && $signature->signature_url) {
			// Get signed URL for display
			$s3Service = app(S3UploadService::class);
			$data['signature_url'] = $s3Service->getSignedUrl($signature->signature_url);
			$data['signature_type'] = $signature->signature_type;
		}

		if ($member->memberDetail) {
			$data['member_details'] = [
				'member_code' => $member->memberDetail->member_code,
				'member_type' => $member->memberDetail->memberType ? [
					'id' => $member->memberDetail->memberType->id,
					'name' => $member->memberDetail->memberType->display_name,
					'is_paid' => $member->memberDetail->memberType->is_paid
				] : null,
				'membership_date' => $member->memberDetail->membership_date,
				'referred_by' => $member->memberDetail->referredBy ? [
					'id' => $member->memberDetail->referredBy->id,
					'name' => $member->memberDetail->referredBy->name
				] : null,
				'family_head' => $member->memberDetail->familyHead ? [
					'id' => $member->memberDetail->familyHead->id,
					'name' => $member->memberDetail->familyHead->name
				] : null,
				'occupation' => $member->memberDetail->occupation,
				'annual_income' => $member->memberDetail->annual_income,
				'qualification' => $member->memberDetail->qualification,
				'subscription_status' => $member->memberDetail->subscription_status,
				'subscription_end_date' => $member->memberDetail->subscription_end_date
			];
		}

		if ($member->currentPosition) {
			$data['current_position'] = [
				'position' => $member->currentPosition->position->display_name,
				'since' => $member->currentPosition->term_start_date,
				'until' => $member->currentPosition->term_end_date
			];
		}

		return $data;
	}

    /**
     * Generate member code
     */
    private function generateMemberCode()
    {
        $prefix = 'MEM';
        $year = Carbon::now()->format('Y');
        
        // Get the last member code for this year
        $lastMember = MemberDetail::where('member_code', 'LIKE', "{$prefix}{$year}%")
            ->orderBy('member_code', 'desc')
            ->first();

        if ($lastMember) {
            $lastNumber = intval(substr($lastMember->member_code, -4));
            $newNumber = $lastNumber + 1;
        } else {
            $newNumber = 1;
        }

        return $prefix . $year . str_pad($newNumber, 4, '0', STR_PAD_LEFT);
    }
}