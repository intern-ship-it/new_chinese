<?php

namespace App\Http\Controllers;

use App\Models\PagodaDevotee;
use App\Traits\ApiResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Validator;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Log;
use App\Models\PagodaFamilyMember;
class PagodaDevoteeController extends Controller
{
    use ApiResponse;

    /**
     * Get all devotees with filters
     */
    public function index(Request $request)
    {
        try {
            $query = PagodaDevotee::with(['user', 'activeRegistrations']);

            // Search
            if ($request->has('search')) {
                $query->search($request->search);
            }

            // Filter by user_id (if linked to user account)
            if ($request->has('user_id')) {
                $query->where('user_id', $request->user_id);
            }

            $perPage = $request->get('per_page', 20);
            $devotees = $query->paginate($perPage);

            // Transform data
            $devotees->getCollection()->transform(function ($devotee) {
                return [
                    'id' => $devotee->id,
                    'name_english' => $devotee->name_english,
                    'name_chinese' => $devotee->name_chinese,
                    'nric' => $devotee->nric,
                    'contact_no' => $devotee->contact_no,
                    'email' => $devotee->email,
                    'total_registrations' => $devotee->registrations()->count(),
                    'active_registrations' => $devotee->activeRegistrations()->count(),
                    'is_linked_to_user' => $devotee->user_id !== null,
                    'created_at' => $devotee->created_at
                ];
            });

            return $this->successResponse($devotees, 'Devotees retrieved successfully');
        } catch (\Exception $e) {
            return $this->errorResponse('Failed to retrieve devotees: ' . $e->getMessage(), 500);
        }
    }

    /**
     * Get single devotee details
     */
    public function show($id)
    {
        try {
            $devotee = PagodaDevotee::with([
                'familyMembers.memberDevotee',
                'headOfFamily',
                'registrations' => function ($query) {
                    $query->orderBy('created_at', 'desc');
                }
            ])->findOrFail($id);

            // Get statistics
            $statistics = [
                'total_registrations' => $devotee->registrations->count(),
                'active_registrations' => $devotee->registrations->where('status', 'active')->count(),
                'total_merit_contributed' => $devotee->registrations->sum('merit_amount'),
            ];

            // Format family members for response
            $familyMembersData = [];
            if ($devotee->is_head_of_family && $devotee->familyMembers) {
                foreach ($devotee->familyMembers as $fm) {
                    $familyMembersData[] = [
                        'id' => $fm->memberDevotee->id,
                        'name' => $fm->memberDevotee->name_english,
                        'name_chinese' => $fm->memberDevotee->name_chinese,
                        'nric' => $fm->memberDevotee->nric,
                        'date_of_birth' => $fm->memberDevotee->date_of_birth,
                        'gender' => $fm->memberDevotee->gender,
                        'relationship' => $fm->relationship,
                    ];
                }
            }

            return $this->successResponse([
                'devotee' => $devotee,
                'statistics' => $statistics,
                'registrations' => $devotee->registrations,
                'family_members' => $familyMembersData,
                'head_of_family' => $devotee->headOfFamily,
            ], 'Devotee details retrieved successfully');

        } catch (\Exception $e) {
            return $this->notFoundResponse('Devotee not found');
        }
    }
    // public function show($id)
    // {
    //     try {
    //         $devotee = PagodaDevotee::with([
    //             'user',
    //             'registrations' => function ($q) {
    //                 $q->orderBy('created_at', 'desc');
    //             }
    //         ])->findOrFail($id);

    //         $data = [
    //             'devotee' => [
    //                 'id' => $devotee->id,
    //                 'name_english' => $devotee->name_english,
    //                 'name_chinese' => $devotee->name_chinese,
    //                 'nric' => $devotee->nric,
    //                 'contact_no' => $devotee->contact_no,
    //                 'email' => $devotee->email,
    //                 'address' => $devotee->address,
    //                 'notes' => $devotee->notes,
    //                 'created_at' => $devotee->created_at
    //             ],
    //             'linked_user' => $devotee->user ? [
    //                 'id' => $devotee->user->id,
    //                 'username' => $devotee->user->username,
    //                 'email' => $devotee->user->email
    //             ] : null,
    //             'statistics' => [
    //                 'total_registrations' => $devotee->registrations()->count(),
    //                 'active_registrations' => $devotee->activeRegistrations()->count(),
    //                 'total_merit_contributed' => $devotee->registrations()->sum('merit_amount')
    //             ],
    //             'registrations' => $devotee->registrations->map(function ($reg) {
    //                 return [
    //                     'id' => $reg->id,
    //                     'light_number' => $reg->light_number,
    //                     'light_code' => $reg->light_code,
    //                     'merit_amount' => $reg->merit_amount,
    //                     'offer_date' => $reg->offer_date,
    //                     'expiry_date' => $reg->expiry_date,
    //                     'status' => $reg->status,
    //                     'receipt_number' => $reg->receipt_number
    //                 ];
    //             })
    //         ];

    //         return $this->successResponse($data, 'Devotee details retrieved successfully');
    //     } catch (\Exception $e) {
    //         return $this->notFoundResponse('Devotee not found');
    //     }
    // }

    /**
     * Create new devotee
     */

    // public function store(Request $request)
    // {
    //     $validator = Validator::make($request->all(), [
    //         'name_english' => 'required|string|max:100',
    //         'name_chinese' => 'nullable|string|max:100',
    //         'nric' => 'required|string|max:20|unique:pagoda_devotees,nric',
    //         'contact_no' => 'required|string|max:20',
    //         'email' => 'nullable|email|max:100',
    //         'address' => 'nullable|string',
    //         'notes' => 'nullable|string',
    //         'user_id' => 'nullable|uuid|exists:users,id'
    //     ]);

    //     if ($validator->fails()) {
    //         return $this->validationErrorResponse($validator->errors());
    //     }

    //     try {
    //         $devotee = PagodaDevotee::create($request->all());

    //         return $this->successResponse(
    //             $devotee,
    //             'Devotee created successfully',
    //             201
    //         );
    //     } catch (\Exception $e) {
    //         return $this->errorResponse('Failed to create devotee: ' . $e->getMessage(), 500);
    //     }
    // }

    /**
     * Update devotee
     */
    public function store(Request $request)
    {
        $validator = Validator::make($request->all(), [
            'name_english' => 'required|string|max:100',
            'name_chinese' => 'nullable|string|max:100',
            'nric' => 'required|string|max:20',
            'contact_no' => 'required|string|max:20',
            'email' => 'nullable|email|max:100',
            'address' => 'nullable|string',
            'date_of_birth' => 'nullable|date',
            'gender' => 'nullable|in:male,female',
            'is_head_of_family' => 'nullable|boolean',
            'family_members' => 'nullable|array',
            'family_members.*.name' => 'required_with:family_members|string|max:100',
            'family_members.*.nric' => 'required_with:family_members|string|max:20',
            'family_members.*.date_of_birth' => 'nullable|date',
            'family_members.*.gender' => 'nullable|in:male,female',
            'family_members.*.relationship' => 'required_with:family_members|string|max:50',
        ]);

        if ($validator->fails()) {
            return $this->validationErrorResponse($validator->errors());
        }

        try {
            DB::beginTransaction();

            // Check if devotee with NRIC already exists
            $existingDevotee = PagodaDevotee::where('nric', $request->nric)->first();

            if ($existingDevotee) {
                return $this->errorResponse('A devotee with this NRIC already exists', 422);
            }

            // Create main devotee
            $devotee = PagodaDevotee::create([
                'name_english' => $request->name_english,
                'name_chinese' => $request->name_chinese,
                'nric' => $request->nric,
                'contact_no' => $request->contact_no,
                'email' => $request->email,
                'address' => $request->address,
                'date_of_birth' => $request->date_of_birth,
                'gender' => $request->gender,
                'is_head_of_family' => $request->is_head_of_family ?? false,
            ]);

            $familyMembersCreated = 0;

            // Create family members if head of family
            if ($request->is_head_of_family && !empty($request->family_members)) {
                foreach ($request->family_members as $memberData) {
                    // Check if family member already exists
                    $existingMember = PagodaDevotee::where('nric', $memberData['nric'])->first();

                    if ($existingMember) {
                        // Link existing devotee as family member
                        $memberDevotee = $existingMember;
                        $memberDevotee->update([
                            'head_of_family_id' => $devotee->id
                        ]);
                    } else {
                        // Create new devotee for family member
                        $memberDevotee = PagodaDevotee::create([
                            'name_english' => $memberData['name'],
                            'name_chinese' => null,
                            'nric' => $memberData['nric'],
                            'contact_no' => $devotee->contact_no, // Use head's contact
                            'email' => null,
                            'address' => $devotee->address, // Use head's address
                            'date_of_birth' => $memberData['date_of_birth'] ?? null,
                            'gender' => $memberData['gender'] ?? null,
                            'is_head_of_family' => false,
                            'head_of_family_id' => $devotee->id,
                        ]);
                    }

                    // Create family relationship record
                    PagodaFamilyMember::updateOrCreate(
                        [
                            'head_of_family_id' => $devotee->id,
                            'member_devotee_id' => $memberDevotee->id,
                        ],
                        [
                            'relationship' => $memberData['relationship'],
                        ]
                    );

                    $familyMembersCreated++;
                }
            }

            DB::commit();

            // Load relationships for response
            $devotee->load(['familyMembers.memberDevotee']);

            return $this->successResponse([
                'devotee' => $devotee,
                'family_members_created' => $familyMembersCreated,
            ], 'Devotee created successfully', 201);

        } catch (\Exception $e) {
            DB::rollBack();
            Log::error('Failed to create devotee: ' . $e->getMessage());
            return $this->errorResponse('Failed to create devotee: ' . $e->getMessage(), 500);
        }
    }

    public function update(Request $request, $id)
    {
        $validator = Validator::make($request->all(), [
            'name_english' => 'required|string|max:100',
            'name_chinese' => 'nullable|string|max:100',
            'nric' => 'required|string|max:20|unique:pagoda_devotees,nric,' . $id,
            'contact_no' => 'required|string|max:20',
            'email' => 'nullable|email|max:100',
            'address' => 'nullable|string',
            'notes' => 'nullable|string'
        ]);

        if ($validator->fails()) {
            return $this->validationErrorResponse($validator->errors());
        }

        try {
            $devotee = PagodaDevotee::findOrFail($id);
            $devotee->update($request->all());

            return $this->successResponse(
                $devotee->fresh(),
                'Devotee updated successfully'
            );
        } catch (\Exception $e) {
            return $this->notFoundResponse('Devotee not found');
        }
    }

    /**
     * Search devotees by NRIC, Contact, or Name
     */
    /**
     * Search devotees by NRIC, Contact, or Name
     */

    public function search(Request $request)
    {
        $query = $request->get('query') ?? $request->get('q');

        if (!$query || strlen($query) < 2) {
            return $this->successResponse([], 'Search query too short');
        }

        $devotees = PagodaDevotee::with(['familyMembers.memberDevotee', 'headOfFamily'])
            ->where(function ($q) use ($query) {
                $q->where('nric', 'ILIKE', "%{$query}%")
                    ->orWhere('name_english', 'ILIKE', "%{$query}%")
                    ->orWhere('name_chinese', 'ILIKE', "%{$query}%")
                    ->orWhere('contact_no', 'ILIKE', "%{$query}%");
            })
            ->limit(10)
            ->get();

        // Format response with family info
        $result = $devotees->map(function ($devotee) {
            $familyMembers = [];

            if ($devotee->is_head_of_family && $devotee->familyMembers) {
                foreach ($devotee->familyMembers as $fm) {
                    $familyMembers[] = [
                        'id' => $fm->memberDevotee->id,
                        'name' => $fm->memberDevotee->name_english,
                        'nric' => $fm->memberDevotee->nric,
                        'relationship' => $fm->relationship,
                    ];
                }
            }

            return [
                'id' => $devotee->id,
                'name_english' => $devotee->name_english,
                'name_chinese' => $devotee->name_chinese,
                'nric' => $devotee->nric,
                'contact_no' => $devotee->contact_no,
                'email' => $devotee->email,
                'address' => $devotee->address,
                'date_of_birth' => $devotee->date_of_birth,
                'gender' => $devotee->gender,
                'is_head_of_family' => $devotee->is_head_of_family,
                'head_of_family_id' => $devotee->head_of_family_id,
                'family_members' => $familyMembers,
                'head_of_family' => $devotee->headOfFamily ? [
                    'id' => $devotee->headOfFamily->id,
                    'name_english' => $devotee->headOfFamily->name_english,
                    'nric' => $devotee->headOfFamily->nric,
                ] : null,
            ];
        });

        return $this->successResponse($result, 'Search results');
    }


    // public function search(Request $request)
    // {
    //     try {
    //         // Option 1: Accept generic 'query' and search all fields
    //         if ($request->has('query')) {
    //             $query = $request->input('query'); // ✅ FIXED: Get string value, not InputBag

    //             $devotees = PagodaDevotee::where(function ($q) use ($query) {
    //                 $q->where('name_english', 'ILIKE', "%{$query}%")
    //                     ->orWhere('name_chinese', 'ILIKE', "%{$query}%")
    //                     ->orWhere('nric', 'ILIKE', "%{$query}%")
    //                     ->orWhere('contact_no', 'ILIKE', "%{$query}%")
    //                     ->orWhere('email', 'ILIKE', "%{$query}%");
    //             })
    //                 ->orderBy('created_at', 'desc')
    //                 ->get();

    //             return $this->successResponse(
    //                 $devotees,
    //                 count($devotees) > 0
    //                     ? count($devotees) . ' devotee(s) found'
    //                     : 'No devotees found'
    //             );
    //         }

    //         // Option 2: Accept specific fields
    //         $validator = Validator::make($request->all(), [
    //             'nric' => 'required_without:contact_no|string',
    //             'contact_no' => 'required_without:nric|string',
    //             'name' => 'nullable|string'
    //         ]);

    //         if ($validator->fails()) {
    //             return $this->validationErrorResponse($validator->errors());
    //         }

    //         $queryBuilder = PagodaDevotee::query();

    //         if ($request->has('nric')) {
    //             $queryBuilder->where('nric', $request->nric);
    //         }

    //         if ($request->has('contact_no')) {
    //             $queryBuilder->where('contact_no', 'ILIKE', "%{$request->contact_no}%");
    //         }

    //         if ($request->has('name')) {
    //             $queryBuilder->where(function ($q) use ($request) {
    //                 $q->where('name_english', 'ILIKE', "%{$request->name}%")
    //                     ->orWhere('name_chinese', 'ILIKE', "%{$request->name}%");
    //             });
    //         }

    //         $devotees = $queryBuilder->orderBy('created_at', 'desc')->get();

    //         return $this->successResponse($devotees, 'Devotees found');
    //     } catch (\Exception $e) {
    //         return $this->errorResponse('Search failed: ' . $e->getMessage(), 500);
    //     }
    // }

    /**
     * Search devotee by NRIC or contact
     */
    public function searchByNricOrContact(Request $request)
    {
        $validator = Validator::make($request->all(), [
            'nric' => 'required_without:contact_no|string',
            'contact_no' => 'required_without:nric|string'
        ]);

        if ($validator->fails()) {
            return $this->validationErrorResponse($validator->errors());
        }

        try {
            $query = PagodaDevotee::query();

            if ($request->has('nric')) {
                $query->where('nric', $request->nric);
            } elseif ($request->has('contact_no')) {
                $query->where('contact_no', $request->contact_no);
            }

            $devotee = $query->with('activeRegistrations')->first();

            if (!$devotee) {
                return $this->notFoundResponse('Devotee not found');
            }

            return $this->successResponse([
                'id' => $devotee->id,
                'name_english' => $devotee->name_english,
                'name_chinese' => $devotee->name_chinese,
                'nric' => $devotee->nric,
                'contact_no' => $devotee->contact_no,
                'email' => $devotee->email,
                'address' => $devotee->address,
                'active_registrations_count' => $devotee->activeRegistrations()->count()
            ], 'Devotee found');
        } catch (\Exception $e) {
            return $this->errorResponse('Search failed: ' . $e->getMessage(), 500);
        }
    }
    /**
 * Get family members by NRIC
 * - If NRIC belongs to Head of Family → Returns all family members
 * - If NRIC belongs to Family Member → Returns head + all family members
 */
    public function getFamilyByNric(Request $request)
    {
        try {
            $nric = $request->input('nric');

            if (!$nric) {
                return $this->errorResponse('NRIC is required', 400);
            }

            // Step 1: Find devotee by NRIC
            $devotee = PagodaDevotee::where('nric', $nric)->first();

            if (!$devotee) {
                return $this->successResponse([
                    'found' => false,
                    'message' => 'No devotee found with this NRIC',
                    'family_head' => null,
                    'family_members' => []
                ]);
            }

            // Step 2: Determine if this person is Head of Family or Family Member
            $familyHeadId = null;
            $isHeadOfFamily = false;
            $familyHead = null;
            $familyMembers = [];

            if ($devotee->is_head_of_family) {
                // This person IS the head of family
                $familyHeadId = $devotee->id;
                $isHeadOfFamily = true;

                // Set family head details
                $familyHead = [
                    'devotee_id' => $devotee->id,
                    'user_id' => $devotee->user_id,
                    'name' => $devotee->name_english,
                    'name_english' => $devotee->name_english,
                    'name_chinese' => $devotee->name_chinese,
                    'nric' => $devotee->nric,
                    'contact_no' => $devotee->contact_no,
                    'email' => $devotee->email,
                    'address' => $devotee->address,
                    'is_head' => true
                ];

            } elseif ($devotee->head_of_family_id) {
                // This person IS a family member (has a head of family)
                $familyHeadId = $devotee->head_of_family_id;
                $isHeadOfFamily = false;

                // Get the head of family
                $headDevotee = PagodaDevotee::find($familyHeadId);

                if ($headDevotee) {
                    $familyHead = [
                        'devotee_id' => $headDevotee->id,
                        'user_id' => $headDevotee->user_id,
                        'name' => $headDevotee->name_english,
                        'name_english' => $headDevotee->name_english,
                        'name_chinese' => $headDevotee->name_chinese,
                        'nric' => $headDevotee->nric,
                        'contact_no' => $headDevotee->contact_no,
                        'email' => $headDevotee->email,
                        'address' => $headDevotee->address,
                        'is_head' => true
                    ];
                }
            } else {
                // This person is neither head nor member - single devotee without family
                return $this->successResponse([
                    'found' => true,
                    'has_family' => false,
                    'message' => 'Devotee found but has no family linked',
                    'searched_nric' => $nric,
                    'is_head_of_family' => false,
                    'devotee' => [
                        'devotee_id' => $devotee->id,
                        'user_id' => $devotee->user_id,
                        'name' => $devotee->name_english,
                        'name_english' => $devotee->name_english,
                        'name_chinese' => $devotee->name_chinese,
                        'nric' => $devotee->nric,
                        'contact_no' => $devotee->contact_no,
                        'email' => $devotee->email,
                        'address' => $devotee->address,
                    ],
                    'family_head' => null,
                    'family_members' => [],
                    'total_family_count' => 1
                ]);
            }

            // Step 3: Get all family members from pagoda_family_members table
            if ($familyHeadId) {
                $familyMemberRecords = PagodaFamilyMember::where('head_of_family_id', $familyHeadId)
                    ->with('memberDevotee')
                    ->get();

                foreach ($familyMemberRecords as $record) {
                    if ($record->memberDevotee) {
                        $memberDevotee = $record->memberDevotee;
                        $familyMembers[] = [
                            'devotee_id' => $memberDevotee->id,
                            'user_id' => $memberDevotee->user_id,
                            'name' => $memberDevotee->name_english,
                            'name_english' => $memberDevotee->name_english,
                            'name_chinese' => $memberDevotee->name_chinese,
                            'nric' => $memberDevotee->nric,
                            'contact_no' => $memberDevotee->contact_no,
                            'email' => $memberDevotee->email,
                            'address' => $memberDevotee->address,
                            'relationship' => $record->relationship,
                            'is_head' => false
                        ];
                    }
                }
            }

            return $this->successResponse([
                'found' => true,
                'has_family' => true,
                'searched_nric' => $nric,
                'is_head_of_family' => $isHeadOfFamily,
                'family_head' => $familyHead,
                'family_members' => $familyMembers,
                'total_family_count' => count($familyMembers) + ($familyHead ? 1 : 0)
            ], 'Family members retrieved successfully');

        } catch (\Exception $e) {
            Log::error('Failed to get family members: ' . $e->getMessage());
            return $this->errorResponse('Failed to get family members: ' . $e->getMessage(), 500);
        }
    }
}
