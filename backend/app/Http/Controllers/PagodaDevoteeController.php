<?php

namespace App\Http\Controllers;

use App\Models\PagodaDevotee;
use App\Traits\ApiResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Validator;

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
            $devotees->getCollection()->transform(function($devotee) {
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
                'user',
                'registrations' => function($q) {
                    $q->orderBy('created_at', 'desc');
                }
            ])->findOrFail($id);

            $data = [
                'devotee' => [
                    'id' => $devotee->id,
                    'name_english' => $devotee->name_english,
                    'name_chinese' => $devotee->name_chinese,
                    'nric' => $devotee->nric,
                    'contact_no' => $devotee->contact_no,
                    'email' => $devotee->email,
                    'address' => $devotee->address,
                    'notes' => $devotee->notes,
                    'created_at' => $devotee->created_at
                ],
                'linked_user' => $devotee->user ? [
                    'id' => $devotee->user->id,
                    'username' => $devotee->user->username,
                    'email' => $devotee->user->email
                ] : null,
                'statistics' => [
                    'total_registrations' => $devotee->registrations()->count(),
                    'active_registrations' => $devotee->activeRegistrations()->count(),
                    'total_merit_contributed' => $devotee->registrations()->sum('merit_amount')
                ],
                'registrations' => $devotee->registrations->map(function($reg) {
                    return [
                        'id' => $reg->id,
                        'light_number' => $reg->light_number,
                        'light_code' => $reg->light_code,
                        'merit_amount' => $reg->merit_amount,
                        'offer_date' => $reg->offer_date,
                        'expiry_date' => $reg->expiry_date,
                        'status' => $reg->status,
                        'receipt_number' => $reg->receipt_number
                    ];
                })
            ];

            return $this->successResponse($data, 'Devotee details retrieved successfully');

        } catch (\Exception $e) {
            return $this->notFoundResponse('Devotee not found');
        }
    }

    /**
     * Create new devotee
     */
    public function store(Request $request)
    {
        $validator = Validator::make($request->all(), [
            'name_english' => 'required|string|max:100',
            'name_chinese' => 'nullable|string|max:100',
            'nric' => 'required|string|max:20|unique:pagoda_devotees,nric',
            'contact_no' => 'required|string|max:20',
            'email' => 'nullable|email|max:100',
            'address' => 'nullable|string',
            'notes' => 'nullable|string',
            'user_id' => 'nullable|uuid|exists:users,id'
        ]);

        if ($validator->fails()) {
            return $this->validationErrorResponse($validator->errors());
        }

        try {
            $devotee = PagodaDevotee::create($request->all());

            return $this->successResponse(
                $devotee,
                'Devotee created successfully',
                201
            );

        } catch (\Exception $e) {
            return $this->errorResponse('Failed to create devotee: ' . $e->getMessage(), 500);
        }
    }

    /**
     * Update devotee
     */
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
}