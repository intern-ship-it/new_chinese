<?php

namespace App\Http\Controllers;

use App\Models\Booking;
use App\Models\BookingItem;
use App\Models\BookingMeta;
use App\Models\BookingItemMeta;
use App\Models\BookingPayment;
use App\Models\RomVenueMaster;
use App\Models\RomSessionMaster;
use App\Models\PaymentMode;
use App\Services\S3UploadService;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Log;
use Illuminate\Support\Facades\Auth;
use Illuminate\Support\Str;
use Carbon\Carbon;

class RomBookingController extends Controller
{
    protected $s3UploadService;

    public function __construct(S3UploadService $s3UploadService)
    {
        $this->s3UploadService = $s3UploadService;
    }

    /**
     * List all ROM bookings with filters and pagination
     */
    /**
     * List all ROM bookings with filters and pagination
     */
    public function index(Request $request)
    {
        try {
            $query = Booking::where('booking_type', 'ROM')
                ->with([
                    'bookingMeta',
                    'bookingItems.bookingItemMeta', // ✅ FIXED: Load item meta relationship
                    'bookingPayments'
                ]);

            // Apply filters
            if ($request->filled('status')) {
                $query->where('booking_status', $request->status);
            }

            if ($request->filled('payment_status')) {
                $query->where('payment_status', $request->payment_status);
            }

            if ($request->filled('date_from')) {
                $query->whereDate('booking_date', '>=', $request->date_from);
            }

            if ($request->filled('date_to')) {
                $query->whereDate('booking_date', '<=', $request->date_to);
            }

            if ($request->filled('search')) {
                $search = $request->search;
                $query->where(function ($q) use ($search) {
                    $q->where('booking_number', 'LIKE', "%{$search}%")
                        ->orWhereHas('bookingMeta', function ($metaQuery) use ($search) {
                            $metaQuery->where('meta_value', 'LIKE', "%{$search}%");
                        });
                });
            }

            // Order by latest
            $query->orderBy('created_at', 'desc');

            // Pagination
            $perPage = $request->get('per_page', 25);
            $bookings = $query->paginate($perPage);

            // Transform data with error handling
            $bookings->getCollection()->transform(function ($booking) {
                try {
                    return $this->transformBookingData($booking);
                } catch (\Exception $e) {
                    Log::error('Error transforming booking ' . $booking->id . ': ' . $e->getMessage());
                    // Return basic data if transformation fails
                    return [
                        'id' => $booking->id,
                        'booking_number' => $booking->booking_number,
                        'booking_date' => $booking->booking_date,
                        'booking_status' => $booking->booking_status,
                        'payment_status' => $booking->payment_status,
                        'total_amount' => $booking->total_amount,
                        'paid_amount' => $booking->paid_amount,
                        'register_name' => 'N/A',
                        'register_phone' => 'N/A',
                        'venue' => [],
                        'session' => [],
                        'couples' => [],
                        'created_at' => $booking->created_at ? $booking->created_at->toDateTimeString() : null,
                        'error' => 'Data transformation failed'
                    ];
                }
            });

            return response()->json([
                'success' => true,
                'data' => $bookings->items(),
                'pagination' => [
                    'total' => $bookings->total(),
                    'per_page' => $bookings->perPage(),
                    'current_page' => $bookings->currentPage(),
                    'last_page' => $bookings->lastPage(),
                    'from' => $bookings->firstItem(),
                    'to' => $bookings->lastItem(),
                ],
            ], 200);
        } catch (\Exception $e) {
            Log::error('ROM Booking Index Error: ' . $e->getMessage());
            Log::error('Stack trace: ' . $e->getTraceAsString());
            return response()->json([
                'success' => false,
                'message' => 'Failed to fetch ROM bookings',
                'error' => $e->getMessage(),
            ], 500);
        }
    }

    /**
     * Get ROM booking statistics
     */
    public function statistics(Request $request)
    {
        try {
            $stats = [
                'total' => Booking::where('booking_type', 'ROM')->count(),
                'pending' => Booking::where('booking_type', 'ROM')
                    ->where('booking_status', 'PENDING')->count(),
                'confirmed' => Booking::where('booking_type', 'ROM')
                    ->where('booking_status', 'CONFIRMED')->count(),
                'completed' => Booking::where('booking_type', 'ROM')
                    ->where('booking_status', 'COMPLETED')->count(),
                'cancelled' => Booking::where('booking_type', 'ROM')
                    ->where('booking_status', 'CANCELLED')->count(),
                'today' => Booking::where('booking_type', 'ROM')
                    ->whereDate('booking_date', Carbon::today())->count(),
                'this_month' => Booking::where('booking_type', 'ROM')
                    ->whereMonth('booking_date', Carbon::now()->month)
                    ->whereYear('booking_date', Carbon::now()->year)->count(),
                'total_revenue' => (float) Booking::where('booking_type', 'ROM')
                    ->where('payment_status', 'FULL')
                    ->sum('total_amount'),
            ];

            return response()->json([
                'success' => true,
                'data' => $stats,
            ], 200);
        } catch (\Exception $e) {
            Log::error('ROM Booking Statistics Error: ' . $e->getMessage());
            Log::error('Stack trace: ' . $e->getTraceAsString());
            return response()->json([
                'success' => false,
                'message' => 'Failed to fetch statistics',
                'error' => $e->getMessage(),
            ], 500);
        }
    }

    /**
     * Store a new ROM booking
     */
    public function store(Request $request)
    {
        try {
            // ✅ FIXED: Added validation for email, phone fields and documents
            $validated = $request->validate([
                'venue_id' => 'required|uuid|exists:rom_venue_masters,id',
                'session_id' => 'required|uuid|exists:rom_session_masters,id',
                'booking_date' => 'required|date',

                // Register details - FIXED: Added email validation
                'register_details' => 'required|array',
                'register_details.register_name' => 'required|string|max:255',
                'register_details.register_ic' => 'required|string|max:50',
                'register_details.register_phone' => 'required|string|max:20',
                'register_details.register_email' => 'sometimes|nullable|email|max:255', // ✅ ADDED

                // Couples - FIXED: Added phone and email validation
                'couples' => 'required|array|min:1',
                'couples.*.bride.name' => 'required|string|max:255',
                'couples.*.bride.ic' => 'required|string|max:50',
                'couples.*.bride.phone' => 'sometimes|nullable|string|max:20', // ✅ ADDED
                'couples.*.bride.email' => 'sometimes|nullable|email|max:255', // ✅ ADDED
                'couples.*.groom.name' => 'required|string|max:255',
                'couples.*.groom.ic' => 'required|string|max:50',
                'couples.*.groom.phone' => 'sometimes|nullable|string|max:20', // ✅ ADDED
                'couples.*.groom.email' => 'sometimes|nullable|email|max:255', // ✅ ADDED

                // Witnesses - FIXED: Added proper validation
                'witnesses' => 'sometimes|nullable|array',
                'witnesses.*.name' => 'required_with:witnesses|string|max:255', // ✅ ADDED
                'witnesses.*.ic' => 'required_with:witnesses|string|max:50', // ✅ ADDED
                'witnesses.*.phone' => 'sometimes|nullable|string|max:20', // ✅ ADDED

                // Documents - FIXED: Added document validation
                'jpn_form' => 'sometimes|nullable|file|mimes:pdf,jpg,jpeg,png|max:5120', // ✅ ADDED
                'nric_cards.*' => 'sometimes|nullable|file|mimes:pdf,jpg,jpeg,png|max:5120', // ✅ ADDED
                'id_proof.*' => 'sometimes|nullable|file|mimes:pdf,jpg,jpeg,png|max:5120', // ✅ ADDED

                'payment_mode_id' => 'required|exists:payment_modes,id',
                'booking_through' => 'in:ADMIN,COUNTER,APP,KIOSK,ONLINE',
            ]);

            DB::beginTransaction();

            $user = Auth::user();
            $environment = config('app.environment_prefix', 'D');

            // Get venue and session data
            $venue = RomVenueMaster::findOrFail($validated['venue_id']);
            $session = RomSessionMaster::findOrFail($validated['session_id']);

            // Generate booking number
            $bookingNumber = $this->generateBookingNumber($environment);

            // Calculate amounts
            $subtotal = $session->amount * count($validated['couples']);
            $totalAmount = $subtotal;
            $paymentMode = PaymentMode::find($validated['payment_mode_id']);

            // Create main booking record
            $booking = Booking::create([
                'booking_number' => $bookingNumber,
                'booking_type' => 'ROM',
                'booking_date' => $validated['booking_date'],
                'booking_status' => 'PENDING',
                'payment_status' => 'PENDING',
                'booking_through' => $validated['booking_through'] ?? 'ADMIN',
                'subtotal' => $subtotal,
                'tax_amount' => 0,
                'discount_amount' => 0,
                'payment_method' => $paymentMode ? $paymentMode->name : null,
                'total_amount' => $totalAmount,
                'paid_amount' => 0,
                'user_id' => $user->id,
                'created_by' => $user->id,
            ]);

            // Store register details in booking_meta
            $this->storeRegisterDetails($booking->id, $validated['register_details']);

            // Store additional notes if provided
            if ($request->filled('additional_notes')) {
                BookingMeta::create([
                    'booking_id' => $booking->id,
                    'meta_key' => 'additional_notes',
                    'meta_value' => $request->additional_notes,
                    'meta_type' => 'text',
                ]);
            }

            // Create booking item for ROM session
            $bookingItem = BookingItem::create([
                'booking_id' => $booking->id,
                'item_type' => 'ROM_SESSION',
                'item_id' => null,
                'item_name' => $session->name_primary,
                'item_name_secondary' => $session->name_secondary,
                'service_date' => $validated['booking_date'],
                'quantity' => count($validated['couples']),
                'unit_price' => $session->amount,
                'total_price' => $subtotal,
                'status' => 'PENDING',
            ]);

            // Store venue details
            $this->storeVenueDetails($bookingItem->id, $venue);

            // Store session details
            $this->storeSessionDetails($bookingItem->id, $session);

            // Store couples data
            $this->storeCouplesData($bookingItem->id, $validated['couples']);

            // ✅ FIXED: Store witnesses data properly
            if (isset($validated['witnesses']) && !empty($validated['witnesses'])) {
                $validWitnesses = array_filter($validated['witnesses'], function ($witness) {
                    return isset($witness['name']) && !empty($witness['name']);
                });

                if (!empty($validWitnesses)) {
                    $this->storeWitnessesData($bookingItem->id, array_values($validWitnesses));
                }
            }

            // ✅ FIXED: Handle document uploads properly
            if ($request->hasFile('jpn_form')) {
                $this->handleSingleDocumentUpload($bookingItem->id, $request->file('jpn_form'), 'jpn_form');
            }

            if ($request->hasFile('nric_cards')) {
                $files = is_array($request->file('nric_cards')) ? $request->file('nric_cards') : [$request->file('nric_cards')];
                $this->handleMultipleDocumentUpload($bookingItem->id, $files, 'nric_cards');
            }

            if ($request->hasFile('id_proof')) {
                $files = is_array($request->file('id_proof')) ? $request->file('id_proof') : [$request->file('id_proof')];
                $this->handleMultipleDocumentUpload($bookingItem->id, $files, 'id_proof');
            }

            // Create payment record
            $paymentReference = $this->generatePaymentReference($environment);

            $payment = BookingPayment::create([
                'booking_id' => $booking->id,
                'payment_date' => now(),
                'amount' => $totalAmount,
                'payment_mode_id' => $validated['payment_mode_id'],
                'payment_reference' => $paymentReference,
                'payment_type' => 'FULL',
                'payment_status' => 'SUCCESS',
                'payment_method' => $paymentMode ? $paymentMode->name : null,
                'paid_through' => $validated['booking_through'] ?? 'ADMIN',
                'created_by' => $user->id,
            ]);

            // Update booking payment status
            $booking->update([
                'payment_status' => 'FULL',
                'paid_amount' => $totalAmount,
                'booking_status' => 'CONFIRMED',
            ]);

            DB::commit();

            // Return complete booking data
            try {
                $bookingData = $this->show($booking->id)->getData();

                if (isset($bookingData->data)) {
                    return response()->json([
                        'success' => true,
                        'message' => 'ROM booking created successfully',
                        'data' => $bookingData->data,
                    ], 201);
                } else {
                    throw new \Exception('Failed to retrieve complete booking data');
                }
            } catch (\Exception $e) {
                Log::warning('ROM Booking created but show() failed: ' . $e->getMessage());

                return response()->json([
                    'success' => true,
                    'message' => 'ROM booking created successfully',
                    'data' => [
                        'id' => $booking->id,
                        'booking_number' => $booking->booking_number,
                        'booking_date' => $booking->booking_date,
                        'booking_status' => $booking->booking_status,
                        'payment_status' => $booking->payment_status,
                        'total_amount' => $booking->total_amount,
                    ],
                ], 201);
            }
        } catch (\Illuminate\Validation\ValidationException $e) {
            DB::rollBack();
            return response()->json([
                'success' => false,
                'message' => 'Validation failed',
                'errors' => $e->errors(),
            ], 422);
        } catch (\Exception $e) {
            DB::rollBack();
            Log::error('ROM Booking Store Error: ' . $e->getMessage());
            Log::error('Stack trace: ' . $e->getTraceAsString());
            return response()->json([
                'success' => false,
                'message' => 'Failed to create ROM booking',
                'error' => $e->getMessage(),
            ], 500);
        }
    }

    /**
     * Show single ROM booking
     */
    public function show($id)
    {
        try {
            $booking = Booking::where('id', $id)
                ->where('booking_type', 'ROM')
                ->with([
                    'bookingMeta',
                    'bookingItems.bookingItemMeta', // ✅ ADDED: Load item meta relationship
                    'bookingPayments',
                    'bookingPayments.paymentMode'
                ])
                ->firstOrFail();

            $data = $this->transformDetailedBookingData($booking);

            return response()->json([
                'success' => true,
                'data' => $data,
            ], 200);
        } catch (\Exception $e) {
            Log::error('ROM Booking Show Error: ' . $e->getMessage());
            Log::error('Stack trace: ' . $e->getTraceAsString());
            return response()->json([
                'success' => false,
                'message' => 'ROM booking not found',
                'error' => $e->getMessage(),
            ], 404);
        }
    }
public function update(Request $request, $id)
{
    try {
        // Find the booking
        $booking = Booking::where('id', $id)
            ->where('booking_type', 'ROM')
            ->firstOrFail();

        // Check if booking can be edited
        if (in_array($booking->booking_status, ['COMPLETED', 'CANCELLED'])) {
            return response()->json([
                'success' => false,
                'message' => 'Cannot edit completed or cancelled bookings',
            ], 400);
        }

        // Validation
        $validated = $request->validate([
            'venue_id' => 'required|uuid|exists:rom_venue_masters,id',
            'session_id' => 'required|uuid|exists:rom_session_masters,id',
            'booking_date' => 'required|date',

            // Register details
            'register_details' => 'required|array',
            'register_details.register_name' => 'required|string|max:255',
            'register_details.register_ic' => 'required|string|max:50',
            'register_details.register_phone' => 'required|string|max:20',
            'register_details.register_email' => 'sometimes|nullable|email|max:255',

            // Couples
            'couples' => 'required|array|min:1',
            'couples.*.bride.name' => 'required|string|max:255',
            'couples.*.bride.ic' => 'required|string|max:50',
            'couples.*.bride.phone' => 'sometimes|nullable|string|max:20',
            'couples.*.bride.email' => 'sometimes|nullable|email|max:255',
            'couples.*.groom.name' => 'required|string|max:255',
            'couples.*.groom.ic' => 'required|string|max:50',
            'couples.*.groom.phone' => 'sometimes|nullable|string|max:20',
            'couples.*.groom.email' => 'sometimes|nullable|email|max:255',

            // Witnesses
            'witnesses' => 'sometimes|nullable|array',
            'witnesses.*.name' => 'required_with:witnesses|string|max:255',
            'witnesses.*.ic' => 'required_with:witnesses|string|max:50',
            'witnesses.*.phone' => 'sometimes|nullable|string|max:20',

            // Documents
            'jpn_form' => 'sometimes|nullable|file|mimes:pdf,jpg,jpeg,png|max:5120',
            'nric_cards.*' => 'sometimes|nullable|file|mimes:pdf,jpg,jpeg,png|max:5120',
            'id_proof.*' => 'sometimes|nullable|file|mimes:pdf,jpg,jpeg,png|max:5120',

            'payment_mode_id' => 'required|exists:payment_modes,id',
        ]);

        DB::beginTransaction();

        $user = Auth::user();

        // Get venue and session data
        $venue = RomVenueMaster::findOrFail($validated['venue_id']);
        $session = RomSessionMaster::findOrFail($validated['session_id']);

        // Calculate amounts
        $subtotal = $session->amount * count($validated['couples']);
        $totalAmount = $subtotal;
        $paymentMode = PaymentMode::find($validated['payment_mode_id']);

        // Update main booking record
        $booking->update([
            'booking_date' => $validated['booking_date'],
            'subtotal' => $subtotal,
            'total_amount' => $totalAmount,
            'payment_method' => $paymentMode ? $paymentMode->name : null,
            'updated_by' => $user->id,
        ]);

        // Update register details in booking_meta
        $this->updateRegisterDetails($booking->id, $validated['register_details']);

        // Get the booking item
        $bookingItem = $booking->bookingItems()->first();

        if ($bookingItem) {
            // Update booking item
            $bookingItem->update([
                'item_name' => $session->name_primary,
                'item_name_secondary' => $session->name_secondary,
                'service_date' => $validated['booking_date'],
                'quantity' => count($validated['couples']),
                'unit_price' => $session->amount,
                'total_price' => $subtotal,
            ]);

            // Update venue details
            $this->updateVenueDetails($bookingItem->id, $venue);

            // Update session details
            $this->updateSessionDetails($bookingItem->id, $session);

            // Update couples data
            $this->updateCouplesData($bookingItem->id, $validated['couples']);

            // Update witnesses data
            if (isset($validated['witnesses']) && !empty($validated['witnesses'])) {
                $validWitnesses = array_filter($validated['witnesses'], function ($witness) {
                    return isset($witness['name']) && !empty($witness['name']);
                });

                if (!empty($validWitnesses)) {
                    $this->updateWitnessesData($bookingItem->id, array_values($validWitnesses));
                }
            } else {
                // Clear existing witnesses if none provided
                BookingItemMeta::where('booking_item_id', $bookingItem->id)
                    ->where('meta_key', 'LIKE', 'witness_%')
                    ->delete();
            }

            // ✅ FIXED: Delete all existing documents before uploading new ones
            if ($request->hasFile('jpn_form') || $request->hasFile('nric_cards') || $request->hasFile('id_proof')) {
                // Delete all existing document records to avoid unique constraint violation
                BookingItemMeta::where('booking_item_id', $bookingItem->id)
                    ->where('meta_key', 'LIKE', 'document_%')
                    ->delete();
                    
                Log::info('Deleted existing documents before re-upload', [
                    'booking_item_id' => $bookingItem->id
                ]);
            }

            // Handle new document uploads
            if ($request->hasFile('jpn_form')) {
                $this->handleSingleDocumentUpload($bookingItem->id, $request->file('jpn_form'), 'jpn_form');
            }

            if ($request->hasFile('nric_cards')) {
                $files = is_array($request->file('nric_cards')) ? $request->file('nric_cards') : [$request->file('nric_cards')];
                $this->handleMultipleDocumentUpload($bookingItem->id, $files, 'nric_cards');
            }

            if ($request->hasFile('id_proof')) {
                $files = is_array($request->file('id_proof')) ? $request->file('id_proof') : [$request->file('id_proof')];
                $this->handleMultipleDocumentUpload($bookingItem->id, $files, 'id_proof');
            }
        }

        // Update payment record if payment mode changed
        $lastPayment = $booking->bookingPayments()->latest()->first();
        if ($lastPayment && $lastPayment->payment_mode_id != $validated['payment_mode_id']) {
            $lastPayment->update([
                'payment_mode_id' => $validated['payment_mode_id'],
                'payment_method' => $paymentMode ? $paymentMode->name : null,
            ]);
        }

        DB::commit();

        // Return complete updated booking data
        try {
            $bookingData = $this->show($booking->id)->getData();

            if (isset($bookingData->data)) {
                return response()->json([
                    'success' => true,
                    'message' => 'ROM booking updated successfully',
                    'data' => $bookingData->data,
                ], 200);
            } else {
                throw new \Exception('Failed to retrieve complete booking data');
            }
        } catch (\Exception $e) {
            Log::warning('ROM Booking updated but show() failed: ' . $e->getMessage());

            return response()->json([
                'success' => true,
                'message' => 'ROM booking updated successfully',
                'data' => [
                    'id' => $booking->id,
                    'booking_number' => $booking->booking_number,
                    'booking_date' => $booking->booking_date,
                    'booking_status' => $booking->booking_status,
                    'payment_status' => $booking->payment_status,
                    'total_amount' => $booking->total_amount,
                ],
            ], 200);
        }
    } catch (\Illuminate\Validation\ValidationException $e) {
        DB::rollBack();
        return response()->json([
            'success' => false,
            'message' => 'Validation failed',
            'errors' => $e->errors(),
        ], 422);
    } catch (\Illuminate\Database\Eloquent\ModelNotFoundException $e) {
        DB::rollBack();
        return response()->json([
            'success' => false,
            'message' => 'ROM booking not found',
        ], 404);
    } catch (\Exception $e) {
        DB::rollBack();
        Log::error('ROM Booking Update Error: ' . $e->getMessage());
        Log::error('Stack trace: ' . $e->getTraceAsString());
        return response()->json([
            'success' => false,
            'message' => 'Failed to update ROM booking',
            'error' => $e->getMessage(),
        ], 500);
    }
}
    private function updateCouplesData($bookingItemId, $couples)
    {
        // Delete existing couple records
        BookingItemMeta::where('booking_item_id', $bookingItemId)
            ->where(function ($query) {
                $query->where('meta_key', 'LIKE', 'couple_%_bride')
                    ->orWhere('meta_key', 'LIKE', 'couple_%_groom');
            })
            ->delete();

        // Insert new couple records
        foreach ($couples as $index => $couple) {
            BookingItemMeta::create([
                'booking_item_id' => $bookingItemId,
                'meta_key' => "couple_{$index}_bride",
                'meta_value' => json_encode($couple['bride']),
                'meta_type' => 'json',
            ]);

            BookingItemMeta::create([
                'booking_item_id' => $bookingItemId,
                'meta_key' => "couple_{$index}_groom",
                'meta_value' => json_encode($couple['groom']),
                'meta_type' => 'json',
            ]);
        }
    }
    private function updateWitnessesData($bookingItemId, $witnesses)
    {
        // Delete existing witness records
        BookingItemMeta::where('booking_item_id', $bookingItemId)
            ->where('meta_key', 'LIKE', 'witness_%')
            ->delete();

        // Insert new witness records
        foreach ($witnesses as $index => $witness) {
            BookingItemMeta::create([
                'booking_item_id' => $bookingItemId,
                'meta_key' => "witness_{$index}",
                'meta_value' => json_encode($witness),
                'meta_type' => 'json',
            ]);
        }
    }
    private function updateVenueDetails($bookingItemId, $venue)
    {
        BookingItemMeta::updateOrCreate(
            [
                'booking_item_id' => $bookingItemId,
                'meta_key' => 'venue_details'
            ],
            [
                'meta_value' => json_encode([
                    'id' => $venue->id,
                    'name_primary' => $venue->name_primary,
                    'name_secondary' => $venue->name_secondary,
                    'city' => $venue->city,
                    'description' => $venue->description,
                ]),
                'meta_type' => 'json',
            ]
        );
    }
    private function updateSessionDetails($bookingItemId, $session)
    {
        BookingItemMeta::updateOrCreate(
            [
                'booking_item_id' => $bookingItemId,
                'meta_key' => 'session_details'
            ],
            [
                'meta_value' => json_encode([
                    'id' => $session->id,
                    'name_primary' => $session->name_primary,
                    'name_secondary' => $session->name_secondary,
                    'from_time' => $session->from_time,
                    'to_time' => $session->to_time,
                    'amount' => $session->amount,
                ]),
                'meta_type' => 'json',
            ]
        );
    }

    /**
     * Update booking status
     */
    public function updateStatus(Request $request, $id)
    {
        try {
            $validated = $request->validate([
                'status' => 'required|in:PENDING,CONFIRMED,COMPLETED,CANCELLED',
                'notes' => 'nullable|string',
            ]);

            $booking = Booking::where('id', $id)
                ->where('booking_type', 'ROM')
                ->firstOrFail();

            DB::beginTransaction();

            $booking->update(['booking_status' => $validated['status']]);

            // Update booking items status
            $booking->bookingItems()->update(['status' => $validated['status']]);

            // Store status change notes if provided
            if ($request->filled('notes')) {
                BookingMeta::create([
                    'booking_id' => $booking->id,
                    'meta_key' => 'status_change_notes',
                    'meta_value' => $validated['notes'],
                    'meta_type' => 'text',
                ]);
            }

            DB::commit();

            return response()->json([
                'success' => true,
                'message' => 'Booking status updated successfully',
                'data' => ['status' => $validated['status']],
            ], 200);
        } catch (\Exception $e) {
            DB::rollBack();
            Log::error('ROM Booking Status Update Error: ' . $e->getMessage());
            return response()->json([
                'success' => false,
                'message' => 'Failed to update booking status',
                'error' => $e->getMessage(),
            ], 500);
        }
    }

    /**
     * Delete ROM booking
     */
    public function destroy($id)
    {
        try {
            $booking = Booking::where('id', $id)
                ->where('booking_type', 'ROM')
                ->firstOrFail();

            // Check if booking can be deleted
            if (in_array($booking->booking_status, ['COMPLETED', 'CONFIRMED'])) {
                return response()->json([
                    'success' => false,
                    'message' => 'Cannot delete confirmed or completed bookings. Please cancel first.',
                ], 400);
            }

            DB::beginTransaction();

            // Delete related records
            BookingMeta::where('booking_id', $booking->id)->delete();

            foreach ($booking->bookingItems as $item) {
                BookingItemMeta::where('booking_item_id', $item->id)->delete();
            }

            $booking->bookingItems()->delete();
            $booking->bookingPayments()->delete();

            // Delete booking
            $booking->delete();

            DB::commit();

            return response()->json([
                'success' => true,
                'message' => 'ROM booking deleted successfully',
            ], 200);
        } catch (\Exception $e) {
            DB::rollBack();
            Log::error('ROM Booking Delete Error: ' . $e->getMessage());
            return response()->json([
                'success' => false,
                'message' => 'Failed to delete ROM booking',
                'error' => $e->getMessage(),
            ], 500);
        }
    }

    // ===========================
    // HELPER METHODS
    // ===========================

    /**
     * Generate unique booking number
     */
    private function generateBookingNumber($environment = 'D')
    {
        $prefix = "RMBD"; // ROM Booking Development
        if ($environment === 'L') {
            $prefix = "RMBL"; // ROM Booking Live
        }

        $date = date('Ymd');
        $lastBooking = Booking::where('booking_number', 'LIKE', "{$prefix}{$date}%")
            ->orderBy('booking_number', 'desc')
            ->first();

        if ($lastBooking) {
            $lastNumber = (int) substr($lastBooking->booking_number, -8);
            $newNumber = $lastNumber + 1;
        } else {
            $newNumber = 1;
        }

        return $prefix . $date . str_pad($newNumber, 8, '0', STR_PAD_LEFT);
    }

    /**
     * Generate unique payment reference
     */
    private function generatePaymentReference($environment = 'D')
    {
        $prefix = "PYD"; // Payment Development
        if ($environment === 'L') {
            $prefix = "PYL"; // Payment Live
        }

        $date = date('Ymd');
        $lastPayment = BookingPayment::where('payment_reference', 'LIKE', "{$prefix}{$date}%")
            ->orderBy('payment_reference', 'desc')
            ->first();

        if ($lastPayment) {
            $lastNumber = (int) substr($lastPayment->payment_reference, -8);
            $newNumber = $lastNumber + 1;
        } else {
            $newNumber = 1;
        }

        return $prefix . $date . str_pad($newNumber, 8, '0', STR_PAD_LEFT);
    }

    /**
     * Store register details in booking_meta
     */
    private function storeRegisterDetails($bookingId, $registerDetails)
    {
        $metaData = [
            ['booking_id' => $bookingId, 'meta_key' => 'register_name', 'meta_value' => $registerDetails['register_name'], 'meta_type' => 'text'],
            ['booking_id' => $bookingId, 'meta_key' => 'register_ic', 'meta_value' => $registerDetails['register_ic'], 'meta_type' => 'text'],
            ['booking_id' => $bookingId, 'meta_key' => 'register_phone', 'meta_value' => $registerDetails['register_phone'], 'meta_type' => 'text'],
        ];

        if (isset($registerDetails['register_email'])) {
            $metaData[] = ['booking_id' => $bookingId, 'meta_key' => 'register_email', 'meta_value' => $registerDetails['register_email'], 'meta_type' => 'email'];
        }

        foreach ($metaData as $data) {
            BookingMeta::create($data);
        }
    }

    /**
     * Update register details
     */
    private function updateRegisterDetails($bookingId, $registerDetails)
    {
        foreach ($registerDetails as $key => $value) {
            BookingMeta::updateOrCreate(
                ['booking_id' => $bookingId, 'meta_key' => $key],
                ['meta_value' => $value, 'meta_type' => 'text']
            );
        }
    }

    /**
     * Store venue details in booking_item_meta
     */
    private function storeVenueDetails($bookingItemId, $venue)
    {
        BookingItemMeta::create([
            'booking_item_id' => $bookingItemId,
            'meta_key' => 'venue_details',
            'meta_value' => json_encode([
                'id' => $venue->id,
                'name_primary' => $venue->name_primary,
                'name_secondary' => $venue->name_secondary,
                'city' => $venue->city,
                'description' => $venue->description,
            ]),
            'meta_type' => 'json',
        ]);
    }

    /**
     * Store session details in booking_item_meta
     */
    private function storeSessionDetails($bookingItemId, $session)
    {
        BookingItemMeta::create([
            'booking_item_id' => $bookingItemId,
            'meta_key' => 'session_details',
            'meta_value' => json_encode([
                'id' => $session->id,
                'name_primary' => $session->name_primary,
                'name_secondary' => $session->name_secondary,
                'from_time' => $session->from_time,
                'to_time' => $session->to_time,
                'amount' => $session->amount,
            ]),
            'meta_type' => 'json',
        ]);
    }

    /**
     * Store couples data (multiple bride & groom)
     */
    private function storeCouplesData($bookingItemId, $couples)
    {
        foreach ($couples as $index => $couple) {
            BookingItemMeta::create([
                'booking_item_id' => $bookingItemId,
                'meta_key' => "couple_{$index}_bride",
                'meta_value' => json_encode($couple['bride']),
                'meta_type' => 'json',
            ]);

            BookingItemMeta::create([
                'booking_item_id' => $bookingItemId,
                'meta_key' => "couple_{$index}_groom",
                'meta_value' => json_encode($couple['groom']),
                'meta_type' => 'json',
            ]);
        }
    }

    /**
     * Store witnesses data
     */
    private function storeWitnessesData($bookingItemId, $witnesses)
    {
        foreach ($witnesses as $index => $witness) {
            BookingItemMeta::create([
                'booking_item_id' => $bookingItemId,
                'meta_key' => "witness_{$index}",
                'meta_value' => json_encode($witness),
                'meta_type' => 'json',
            ]);
        }
    }

    /**
     * Handle document uploads to S3
     */
    private function handleDocumentUploads($bookingItemId, $documents)
    {
        foreach ($documents as $key => $file) {
            try {
                $path = $this->s3UploadService->uploadFile(
                    $file,
                    'rom-bookings/' . date('Y/m')
                );

                BookingItemMeta::create([
                    'booking_item_id' => $bookingItemId,
                    'meta_key' => "document_{$key}",
                    'meta_value' => json_encode([
                        'name' => $file->getClientOriginalName(),
                        'type' => $key,
                        'url' => $path,
                        'uploaded_at' => now()->toDateTimeString(),
                    ]),
                    'meta_type' => 'json',
                ]);
            } catch (\Exception $e) {
                Log::error("Document upload failed for {$key}: " . $e->getMessage());
            }
        }
    }

    /**
     * Transform booking data for listing - WITH NULL-SAFE CHECKS
     */
    private function transformBookingData($booking)
    {
        try {
            // Get register details with null-safe access
            $registerName = 'N/A';
            $registerPhone = 'N/A';

            if ($booking->bookingMeta && $booking->bookingMeta instanceof \Illuminate\Support\Collection) {
                $registerMeta = $booking->bookingMeta->where('meta_key', 'register_name')->first();
                $registerName = $registerMeta ? $registerMeta->meta_value : 'N/A';

                $registerPhoneMeta = $booking->bookingMeta->where('meta_key', 'register_phone')->first();
                $registerPhone = $registerPhoneMeta ? $registerPhoneMeta->meta_value : 'N/A';
            }

            // Get venue and session from booking items
            $venueDetails = [];
            $sessionDetails = [];
            $couples = [];

            if ($booking->bookingItems && $booking->bookingItems instanceof \Illuminate\Support\Collection) {
                $bookingItem = $booking->bookingItems->first();

                if ($bookingItem) {
                    // ✅ FIXED: Use the loaded relationship instead of direct query
                    $itemMetas = $bookingItem->bookingItemMeta ?? collect();

                    // Get venue details
                    $venueMeta = $itemMetas->where('meta_key', 'venue_details')->first();
                    if ($venueMeta && $venueMeta->meta_value) {
                        try {
                            $venueDetails = json_decode($venueMeta->meta_value, true) ?? [];
                        } catch (\Exception $e) {
                            Log::warning('Failed to decode venue_details for booking ' . $booking->id);
                            $venueDetails = [];
                        }
                    }

                    // Get session details
                    $sessionMeta = $itemMetas->where('meta_key', 'session_details')->first();
                    if ($sessionMeta && $sessionMeta->meta_value) {
                        try {
                            $sessionDetails = json_decode($sessionMeta->meta_value, true) ?? [];
                        } catch (\Exception $e) {
                            Log::warning('Failed to decode session_details for booking ' . $booking->id);
                            $sessionDetails = [];
                        }
                    }

                    // Get couples
                    $coupleMetas = $itemMetas->filter(function ($meta) {
                        return strpos($meta->meta_key, 'couple_') === 0;
                    });

                    $coupleData = [];
                    foreach ($coupleMetas as $meta) {
                        if ($meta->meta_value) {
                            try {
                                $coupleData[$meta->meta_key] = json_decode($meta->meta_value, true) ?? [];
                            } catch (\Exception $e) {
                                Log::warning('Failed to decode couple data for booking ' . $booking->id);
                            }
                        }
                    }

                    // Group by couple index
                    $coupleGroups = [];
                    foreach ($coupleData as $key => $data) {
                        preg_match('/couple_(\d+)_(bride|groom)/', $key, $matches);
                        if ($matches) {
                            $index = $matches[1];
                            $type = $matches[2];
                            if (!isset($coupleGroups[$index])) {
                                $coupleGroups[$index] = [];
                            }
                            $coupleGroups[$index][$type] = $data;
                        }
                    }
                    $couples = array_values($coupleGroups);
                }
            }

            return [
                'id' => $booking->id,
                'booking_number' => $booking->booking_number,
                'booking_date' => $booking->booking_date,
                'booking_status' => $booking->booking_status,
                'payment_status' => $booking->payment_status,
                'total_amount' => (float) $booking->total_amount,
                'paid_amount' => (float) $booking->paid_amount,
                'register_name' => $registerName,
                'register_phone' => $registerPhone,
                'venue' => $venueDetails,
                'session' => $sessionDetails,
                'couples' => $couples,
                'created_at' => $booking->created_at ? $booking->created_at->toDateTimeString() : null,
            ];
        } catch (\Exception $e) {
            Log::error('transformBookingData error for booking ' . $booking->id . ': ' . $e->getMessage());
            throw $e;
        }
    }

    /**
     * Transform detailed booking data - WITH DOCUMENT SIGNED URLS
     */
    private function transformDetailedBookingData($booking)
    {
        try {
            $data = $this->transformBookingData($booking);

            // Add register details
            $registerDetails = [];
            if ($booking->bookingMeta && $booking->bookingMeta instanceof \Illuminate\Support\Collection) {
                foreach ($booking->bookingMeta as $meta) {
                    if (strpos($meta->meta_key, 'register_') === 0) {
                        $registerDetails[str_replace('register_', '', $meta->meta_key)] = $meta->meta_value;
                    }
                }
            }
            $data['register_details'] = $registerDetails;

            // Add witnesses
            if ($booking->bookingItems && $booking->bookingItems instanceof \Illuminate\Support\Collection) {
                $bookingItem = $booking->bookingItems->first();
                if ($bookingItem) {
                    $itemMetas = $bookingItem->bookingItemMeta ?? collect();

                    $witnesses = [];
                    $witnessMetas = $itemMetas->filter(function ($meta) {
                        return strpos($meta->meta_key, 'witness_') === 0;
                    });

                    foreach ($witnessMetas as $meta) {
                        if ($meta->meta_value) {
                            try {
                                $decodedWitness = json_decode($meta->meta_value, true);
                                if ($decodedWitness && isset($decodedWitness['name']) && !empty($decodedWitness['name'])) {
                                    $witnesses[] = $decodedWitness;
                                }
                            } catch (\Exception $e) {
                                Log::warning('Failed to decode witness for booking ' . $booking->id);
                            }
                        }
                    }
                    $data['witnesses'] = $witnesses;

                    // ✅ FIXED: Add documents WITH SIGNED URLS - Extract string path from array
                    $documents = [];
                    $documentMetas = $itemMetas->filter(function ($meta) {
                        return strpos($meta->meta_key, 'document_') === 0;
                    });

                    foreach ($documentMetas as $meta) {
                        if ($meta->meta_value) {
                            try {
                                $document = json_decode($meta->meta_value, true);

                                if ($document && isset($document['url'])) {
                                    // ✅ FIXED: Extract actual file path string from document array
                                    $filePath = $document['url'];

                                    // Handle if url is an array (nested structure)
                                    if (is_array($filePath)) {
                                        $filePath = $filePath['url'] ?? $filePath['path'] ?? null;
                                    }

                                    // Only proceed if we have a valid string path
                                    if (is_string($filePath) && !empty($filePath)) {
                                        // Generate signed URL
                                        try {
                                            $signedUrl = $this->s3UploadService->getSignedUrl($filePath);
                                            $document['file_url'] = $signedUrl;
                                            $document['signed_url'] = $signedUrl;

                                            Log::info('Generated signed URL for ROM document', [
                                                'booking_id' => $booking->id,
                                                'document_type' => $document['type'] ?? 'unknown',
                                                'original_path' => $filePath
                                            ]);
                                        } catch (\Exception $e) {
                                            Log::error('Failed to generate signed URL for ROM document: ' . $e->getMessage(), [
                                                'booking_id' => $booking->id,
                                                'document_url' => $filePath,
                                                'error' => $e->getMessage()
                                            ]);

                                            // Fallback: try to get permanent URL
                                            try {
                                                $document['file_url'] = \Storage::disk('s3')->url($filePath);
                                                $document['signed_url'] = $document['file_url'];
                                            } catch (\Exception $fallbackError) {
                                                Log::error('Fallback URL generation also failed: ' . $fallbackError->getMessage());
                                                $document['file_url'] = null;
                                                $document['signed_url'] = null;
                                            }
                                        }
                                    } else {
                                        Log::warning('Invalid file path for ROM document', [
                                            'booking_id' => $booking->id,
                                            'document_url' => $document['url'],
                                            'type' => gettype($filePath)
                                        ]);
                                        $document['file_url'] = null;
                                        $document['signed_url'] = null;
                                    }

                                    $documents[] = $document;
                                }
                            } catch (\Exception $e) {
                                Log::error('Failed to process document for booking ' . $booking->id . ': ' . $e->getMessage());
                            }
                        }
                    }
                    $data['documents'] = $documents;
                }
            }

            // Add payment details with null-safe access
            $data['payments'] = [];
            if ($booking->bookingPayments && $booking->bookingPayments instanceof \Illuminate\Support\Collection) {
                $data['payments'] = $booking->bookingPayments->map(function ($payment) {
                    return [
                        'id' => $payment->id,
                        'payment_date' => $payment->payment_date,
                        'amount' => (float) $payment->amount,
                        'payment_reference' => $payment->payment_reference,
                        'payment_type' => $payment->payment_type,
                        'payment_status' => $payment->payment_status,
                        'payment_mode' => [
                            'id' => optional($payment->paymentMode)->id ?? null,
                            'name' => optional($payment->paymentMode)->name ?? 'N/A',
                        ],
                    ];
                });
            }

            // Add additional notes
            $data['additional_notes'] = '';
            if ($booking->bookingMeta && $booking->bookingMeta instanceof \Illuminate\Support\Collection) {
                $additionalNotesMeta = $booking->bookingMeta
                    ->where('meta_key', 'additional_notes')
                    ->first();
                $data['additional_notes'] = $additionalNotesMeta ? $additionalNotesMeta->meta_value : '';
            }

            return $data;
        } catch (\Exception $e) {
            Log::error('transformDetailedBookingData error for booking ' . $booking->id . ': ' . $e->getMessage());
            Log::error('Stack trace: ' . $e->getTraceAsString());
            throw $e;
        }
    }


    /**
     * Handle single document upload
     */
    private function handleSingleDocumentUpload($bookingItemId, $file, $type, $isUpdate = false)
    {
        try {
            $path = $this->s3UploadService->uploadFile(
                $file,
                'rom-bookings/' . date('Y/m')
            );

            $documentData = [
                'booking_item_id' => $bookingItemId,
                'meta_key' => "document_{$type}",
                'meta_value' => json_encode([
                    'name' => $file->getClientOriginalName(),
                    'type' => $type,
                    'url' => $path,
                    'size' => $file->getSize(),
                    'mime_type' => $file->getMimeType(),
                    'uploaded_at' => now()->toDateTimeString(),
                ]),
                'meta_type' => 'json',
            ];

            // ✅ FIXED: Use updateOrCreate for updates to avoid duplicate key violation
            if ($isUpdate) {
                BookingItemMeta::updateOrCreate(
                    [
                        'booking_item_id' => $bookingItemId,
                        'meta_key' => "document_{$type}"
                    ],
                    [
                        'meta_value' => $documentData['meta_value'],
                        'meta_type' => $documentData['meta_type']
                    ]
                );
            } else {
                BookingItemMeta::create($documentData);
            }

            Log::info("Document uploaded successfully: {$type} for booking_item: {$bookingItemId}");
        } catch (\Exception $e) {
            Log::error("Single document upload failed for {$type}: " . $e->getMessage());
            throw $e;
        }
    }


    private function handleMultipleDocumentUpload($bookingItemId, $files, $type, $isUpdate = false)
    {
        try {
            // ✅ FIXED: For updates, delete existing documents of this type first
            if ($isUpdate) {
                BookingItemMeta::where('booking_item_id', $bookingItemId)
                    ->where('meta_key', 'LIKE', "document_{$type}%")
                    ->delete();
            }

            foreach ($files as $index => $file) {
                $path = $this->s3UploadService->uploadFile(
                    $file,
                    'rom-bookings/' . date('Y/m')
                );

                BookingItemMeta::create([
                    'booking_item_id' => $bookingItemId,
                    'meta_key' => "document_{$type}_{$index}",
                    'meta_value' => json_encode([
                        'name' => $file->getClientOriginalName(),
                        'type' => $type,
                        'index' => $index,
                        'url' => $path,
                        'size' => $file->getSize(),
                        'mime_type' => $file->getMimeType(),
                        'uploaded_at' => now()->toDateTimeString(),
                    ]),
                    'meta_type' => 'json',
                ]);
            }
        } catch (\Exception $e) {
            Log::error("Multiple document upload failed for {$type}: " . $e->getMessage());
            throw $e;
        }
    }
}
