<?php

namespace App\Http\Controllers;

use App\Models\PagodaDevotee;
use App\Models\PagodaLightRegistration;
use App\Services\PagodaRegistrationService;
use App\Services\PagodaLightService;
use App\Traits\ApiResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Validator;
use Carbon\Carbon;

class PagodaRegistrationController extends Controller
{
    use ApiResponse;

    protected $registrationService;
    protected $lightService;

    public function __construct(
        PagodaRegistrationService $registrationService,
        PagodaLightService $lightService
    ) {
        $this->registrationService = $registrationService;
        $this->lightService = $lightService;
    }

    /**
     * Get all registrations with filters
     */
    public function index(Request $request)
    {
        try {
            $query = PagodaLightRegistration::with([
                'devotee',
                'lightSlot.block.tower',
                'paymentMode',
                'staff'
            ]);

            // Filter by status
            if ($request->has('status')) {
                if (is_array($request->status)) {
                    $query->whereIn('status', $request->status);
                } else {
                    $query->where('status', $request->status);
                }
            }

            // Filter by tower
            if ($request->has('tower_id')) {
                $query->whereHas('lightSlot.block', function ($q) use ($request) {
                    $q->where('tower_id', $request->tower_id);
                });
            }

            // Filter by block
            if ($request->has('block_id')) {
                $query->whereHas('lightSlot', function ($q) use ($request) {
                    $q->where('block_id', $request->block_id);
                });
            }

            // Filter by date range
            if ($request->has('offer_date_from')) {
                $query->where('offer_date', '>=', $request->offer_date_from);
            }
            if ($request->has('offer_date_to')) {
                $query->where('offer_date', '<=', $request->offer_date_to);
            }

            // Filter by expiry date range
            if ($request->has('expiry_date_from')) {
                $query->where('expiry_date', '>=', $request->expiry_date_from);
            }
            if ($request->has('expiry_date_to')) {
                $query->where('expiry_date', '<=', $request->expiry_date_to);
            }

            // Search by devotee, light number, or receipt
            if ($request->has('search')) {
                $search = $request->search;
                $query->where(function ($q) use ($search) {
                    $q->where('light_number', 'LIKE', "%{$search}%")
                        ->orWhere('light_code', 'ILIKE', "%{$search}%")
                        ->orWhere('receipt_number', 'ILIKE', "%{$search}%")
                        ->orWhereHas('devotee', function ($sq) use ($search) {
                            $sq->where('name_english', 'ILIKE', "%{$search}%")
                                ->orWhere('name_chinese', 'ILIKE', "%{$search}%")
                                ->orWhere('nric', 'ILIKE', "%{$search}%")
                                ->orWhere('contact_no', 'ILIKE', "%{$search}%");
                        });
                });
            }

            // Sorting
            $sortBy = $request->get('sort_by', 'created_at');
            $sortOrder = $request->get('sort_order', 'desc');
            $query->orderBy($sortBy, $sortOrder);

            $perPage = $request->get('per_page', 20);
            $registrations = $query->paginate($perPage);

            // Transform data
            // Transform data
            $registrations->getCollection()->transform(function ($reg) {
                // Check if relationships are loaded properly
                $light = $reg->lightSlot ?? null;
                $devotee = $reg->devotee ?? null;

                return [
                    'id' => $reg->id,
                    'light_number' => $reg->light_number,
                    'light_code' => $reg->light_code,
                    'location' => $light && $light->block ? [
                        'tower' => $light->block->tower->tower_name ?? 'N/A',
                        'block' => $light->block->block_name ?? 'N/A',
                        'floor' => $reg->floor_number,
                        'position' => $reg->rag_position
                    ] : [
                        'tower' => 'N/A',
                        'block' => 'N/A',
                        'floor' => $reg->floor_number,
                        'position' => $reg->rag_position
                    ],
                    'devotee' => $devotee ? [
                        'id' => $devotee->id,
                        'name_english' => $devotee->name_english,
                        'name_chinese' => $devotee->name_chinese,
                        'contact_no' => $devotee->contact_no
                    ] : [
                        'id' => null,
                        'name_english' => 'N/A',
                        'name_chinese' => 'N/A',
                        'contact_no' => 'N/A'
                    ],
                    'light_option' => $reg->light_option ?? 'new_light',
                    'merit_amount' => (float) $reg->merit_amount,
                    'offer_date' => $reg->offer_date,
                    'expiry_date' => $reg->expiry_date,
                    'days_until_expiry' => method_exists($reg, 'daysUntilExpiry') ? $reg->daysUntilExpiry() : null,
                    'payment_method' => $reg->payment_method ?? 'cash',
                    'receipt_number' => $reg->receipt_number,
                    'status' => $reg->status,
                    'staff_name' => $reg->staff ? $reg->staff->name : null,
                    'created_at' => $reg->created_at ? $reg->created_at->toISOString() : null
                ];
            });

            return $this->successResponse($registrations, 'Registrations retrieved successfully');
        } catch (\Exception $e) {
            return $this->errorResponse('Failed to retrieve registrations: ' . $e->getMessage(), 500);
        }
    }

    /**
     * Get single registration details
     */
    public function show($id)
    {
        try {
            $registration = PagodaLightRegistration::with([
                'devotee',
                'lightSlot.block.tower',
                'paymentMode',
                'staff',
                'renewals.newRegistration',
                'renewedFrom.originalRegistration',
                'reminders'
            ])->findOrFail($id);

            $data = [
                'registration' => [
                    'id' => $registration->id,
                    'receipt_number' => $registration->receipt_number,
                    'light_option' => $registration->light_option,
                    'merit_amount' => $registration->merit_amount,
                    'offer_date' => $registration->offer_date,
                    'expiry_date' => $registration->expiry_date,
                    'days_until_expiry' => $registration->daysUntilExpiry(),
                    'payment_method' => $registration->payment_method,
                    'payment_reference' => $registration->payment_reference,
                    'status' => $registration->status,
                    'remarks' => $registration->remarks,
                    'created_at' => $registration->created_at
                ],
                'devotee' => [
                    'id' => $registration->devotee->id,
                    'name_english' => $registration->devotee->name_english,
                    'name_chinese' => $registration->devotee->name_chinese,
                    'nric' => $registration->devotee->nric,
                    'contact_no' => $registration->devotee->contact_no,
                    'email' => $registration->devotee->email,
                    'address' => $registration->devotee->address
                ],
                'light' => [
                    'light_number' => $registration->light_number,
                    'light_code' => $registration->light_code,
                    'location' => [
                        'tower' => $registration->lightSlot->block->tower->tower_name,
                        'tower_code' => $registration->tower_code,
                        'block' => $registration->lightSlot->block->block_name,
                        'block_code' => $registration->block_code,
                        'floor' => $registration->floor_number,
                        'position' => $registration->rag_position
                    ]
                ],
                'staff' => $registration->staff ? [
                    'id' => $registration->staff->id,
                    'name' => $registration->staff->name
                ] : null,
                'renewal_info' => [
                    'is_renewed' => $registration->status === 'renewed',
                    'renewed_to' => $registration->renewals->first() ? [
                        'id' => $registration->renewals->first()->new_registration_id,
                        'receipt_number' => $registration->renewals->first()->newRegistration->receipt_number
                    ] : null,
                    'renewed_from' => $registration->renewedFrom ? [
                        'id' => $registration->renewedFrom->original_registration_id,
                        'receipt_number' => $registration->renewedFrom->originalRegistration->receipt_number
                    ] : null
                ],
                'reminders' => $registration->reminders->map(function ($reminder) {
                    return [
                        'type' => $reminder->reminder_type,
                        'scheduled_date' => $reminder->scheduled_date,
                        'sent_date' => $reminder->sent_date,
                        'delivery_status' => $reminder->delivery_status
                    ];
                })
            ];

            return $this->successResponse($data, 'Registration details retrieved successfully');
        } catch (\Exception $e) {
            return $this->notFoundResponse('Registration not found');
        }
    }

    /**
     * Create new registration (main booking endpoint)
     */
    public function store(Request $request)
    {
        $validator = Validator::make($request->all(), [
            // Devotee info
            'devotee.name_english' => 'required|string|max:100',
            'devotee.name_chinese' => 'nullable|string|max:100',
            'devotee.nric' => 'required|string|max:20',
            'devotee.contact_no' => 'required|string|max:20',
            'devotee.email' => 'nullable|email|max:100',
            'devotee.address' => 'nullable|string',

            // Light selection (either light_number for manual or leave empty for auto)
            'light_number' => 'nullable|integer|exists:pagoda_light_slots,light_number',
            'light_slot_id' => 'nullable|uuid|exists:pagoda_light_slots,id',
            'block_id' => 'nullable|uuid|exists:pagoda_blocks,id', // For auto-assignment within specific block

            // Registration details
            'light_option' => 'required|in:new_light,family_light',
            'merit_amount' => 'required|numeric|min:1',
            'offer_date' => 'required|date',

            // Payment
            'payment_method' => 'required|string|max:50',
            'payment_reference' => 'nullable|string|max:100',
            'payment_mode_id' => 'nullable|integer|exists:payment_modes,id',

            // Optional
            'remarks' => 'nullable|string',
            'receipt_number' => 'nullable|string|max:50' // Optional, will be auto-generated if not provided
        ]);

        if ($validator->fails()) {
            return $this->validationErrorResponse($validator->errors());
        }

        try {
            $result = $this->registrationService->createRegistration($request->all());

            if ($result['success']) {
                return $this->successResponse(
                    $result['registration'],
                    $result['message'],
                    201
                );
            } else {
                return $this->errorResponse($result['message'], 400);
            }
        } catch (\Exception $e) {
            return $this->errorResponse('Failed to create registration: ' . $e->getMessage(), 500);
        }
    }

    /**
     * Update registration (limited fields only)
     */
    public function update(Request $request, $id)
    {
        $validator = Validator::make($request->all(), [
            'remarks' => 'nullable|string',
            'payment_reference' => 'nullable|string|max:100'
        ]);

        if ($validator->fails()) {
            return $this->validationErrorResponse($validator->errors());
        }

        try {
            $registration = PagodaLightRegistration::findOrFail($id);

            // Only allow update if active
            if ($registration->status !== 'active') {
                return $this->errorResponse('Cannot update non-active registration', 400);
            }

            $registration->update($request->only(['remarks', 'payment_reference']));

            return $this->successResponse(
                $registration->fresh(['devotee', 'lightSlot.block.tower']),
                'Registration updated successfully'
            );
        } catch (\Exception $e) {
            return $this->notFoundResponse('Registration not found');
        }
    }

    /**
     * Renew registration
     */
    public function renew(Request $request, $id)
    {
        $validator = Validator::make($request->all(), [
            'offer_date' => 'required|date',
            'merit_amount' => 'required|numeric|min:1',
            'light_option' => 'required|in:new_light,family_light',
            'payment_method' => 'required|string|max:50',
            'payment_reference' => 'nullable|string|max:100',
            'payment_mode_id' => 'nullable|integer|exists:payment_modes,id',
            'remarks' => 'nullable|string'
        ]);

        if ($validator->fails()) {
            return $this->validationErrorResponse($validator->errors());
        }

        try {
            $result = $this->registrationService->renewRegistration($id, $request->all());

            if ($result['success']) {
                return $this->successResponse(
                    $result['registration'],
                    'Registration renewed successfully',
                    201
                );
            } else {
                return $this->errorResponse($result['message'], 400);
            }
        } catch (\Exception $e) {
            return $this->errorResponse('Failed to renew registration: ' . $e->getMessage(), 500);
        }
    }

    /**
     * Terminate registration
     */
    public function terminate(Request $request, $id)
    {
        $validator = Validator::make($request->all(), [
            'termination_reason' => 'required|string|max:500'
        ]);

        if ($validator->fails()) {
            return $this->validationErrorResponse($validator->errors());
        }

        try {
            $result = $this->registrationService->terminateRegistration(
                $id,
                $request->termination_reason
            );

            if ($result['success']) {
                return $this->successResponse(null, $result['message']);
            } else {
                return $this->errorResponse($result['message'], 400);
            }
        } catch (\Exception $e) {
            return $this->errorResponse('Failed to terminate registration: ' . $e->getMessage(), 500);
        }
    }

    /**
     * Get expiring registrations
     */
    public function expiring(Request $request)
    {
        try {
            $days = $request->get('days', 30);

            $registrations = PagodaLightRegistration::with([
                'devotee',
                'lightSlot.block.tower'
            ])
                ->expiringSoon($days)
                ->orderBy('expiry_date', 'asc')
                ->get()
                ->map(function ($reg) {
                    return [
                        'id' => $reg->id,
                        'receipt_number' => $reg->receipt_number,
                        'light_number' => $reg->light_number,
                        'light_code' => $reg->light_code,
                        'devotee' => [
                            'name' => $reg->devotee->name_english,
                            'contact' => $reg->devotee->contact_no
                        ],
                        'expiry_date' => $reg->expiry_date,
                        'days_until_expiry' => $reg->daysUntilExpiry(),
                        'merit_amount' => $reg->merit_amount
                    ];
                });

            return $this->successResponse(
                $registrations,
                "Found {$registrations->count()} registrations expiring within {$days} days"
            );
        } catch (\Exception $e) {
            return $this->errorResponse('Failed to retrieve expiring registrations: ' . $e->getMessage(), 500);
        }
    }

    /**
     * Get registration statistics
     */
    public function statistics(Request $request)
    {
        try {
            $startDate = $request->get('start_date', Carbon::now()->startOfMonth());
            $endDate = $request->get('end_date', Carbon::now()->endOfMonth());

            $stats = [
                'total_registrations' => PagodaLightRegistration::whereBetween('created_at', [$startDate, $endDate])->count(),
                'active_registrations' => PagodaLightRegistration::where('status', 'active')->count(),
                'expired_registrations' => PagodaLightRegistration::where('status', 'expired')->count(),
                'terminated_registrations' => PagodaLightRegistration::where('status', 'terminated')->count(),
                'expiring_in_30_days' => PagodaLightRegistration::expiringSoon(30)->count(),
                'expiring_in_7_days' => PagodaLightRegistration::expiringSoon(7)->count(),
                'total_revenue' => PagodaLightRegistration::whereBetween('created_at', [$startDate, $endDate])
                    ->sum('merit_amount'),
                'average_merit_amount' => PagodaLightRegistration::whereBetween('created_at', [$startDate, $endDate])
                    ->avg('merit_amount'),
                'by_light_option' => [
                    'new_light' => PagodaLightRegistration::where('light_option', 'new_light')
                        ->whereBetween('created_at', [$startDate, $endDate])
                        ->count(),
                    'family_light' => PagodaLightRegistration::where('light_option', 'family_light')
                        ->whereBetween('created_at', [$startDate, $endDate])
                        ->count()
                ],
                'renewal_rate' => $this->calculateRenewalRate()
            ];

            return $this->successResponse($stats, 'Statistics retrieved successfully');
        } catch (\Exception $e) {
            return $this->errorResponse('Failed to retrieve statistics: ' . $e->getMessage(), 500);
        }
    }

    /**
     * Calculate renewal rate
     */
    private function calculateRenewalRate()
    {
        $expired = PagodaLightRegistration::where('status', 'expired')
            ->whereDate('expiry_date', '>=', Carbon::now()->subMonths(3))
            ->count();

        $renewed = PagodaLightRegistration::where('status', 'renewed')
            ->whereDate('expiry_date', '>=', Carbon::now()->subMonths(3))
            ->count();

        $total = $expired + $renewed;

        return $total > 0 ? round(($renewed / $total) * 100, 2) : 0;
    }

    /**
     * Generate receipt number
     */
    public function generateReceiptNumber()
    {
        try {
            $receiptNumber = $this->lightService->generateReceiptNumber();

            return $this->successResponse(
                ['receipt_number' => $receiptNumber],
                'Receipt number generated'
            );
        } catch (\Exception $e) {
            return $this->errorResponse('Failed to generate receipt number: ' . $e->getMessage(), 500);
        }
    }

    /**
     * Search registration by receipt number
     */
    public function searchByReceipt($receiptNumber)
    {
        try {
            $registration = PagodaLightRegistration::with([
                'devotee',
                'lightSlot.block.tower',
                'staff'
            ])
                ->byReceiptNumber($receiptNumber)
                ->first();

            if (!$registration) {
                return $this->notFoundResponse('Registration not found with this receipt number');
            }

            return $this->successResponse(
                [
                    'id' => $registration->id,
                    'receipt_number' => $registration->receipt_number,
                    'light_number' => $registration->light_number,
                    'light_code' => $registration->light_code,
                    'devotee' => [
                        'name_english' => $registration->devotee->name_english,
                        'name_chinese' => $registration->devotee->name_chinese,
                        'contact_no' => $registration->devotee->contact_no
                    ],
                    'merit_amount' => $registration->merit_amount,
                    'offer_date' => $registration->offer_date,
                    'expiry_date' => $registration->expiry_date,
                    'status' => $registration->status
                ],
                'Registration found'
            );
        } catch (\Exception $e) {
            return $this->errorResponse('Search failed: ' . $e->getMessage(), 500);
        }
    }
}
