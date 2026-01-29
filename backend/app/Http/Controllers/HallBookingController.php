<?php

namespace App\Http\Controllers;

use App\Http\Controllers\Controller;
use App\Models\Booking;
use App\Models\BookingItem;
use App\Models\BookingItemMeta;
use App\Models\BookingMeta;
use App\Models\BookingPayment;
use App\Models\PaymentMode;
use App\Models\VenueMaster;
use App\Models\SessionMaster;
use App\Models\PackageMaster;
use App\Models\AddonGroup;
use App\Models\AddonService;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Log;
use Illuminate\Support\Facades\Validator;
use Carbon\Carbon;

class HallBookingController extends Controller
{
    /**
     * Booking type constant
     */
    const BOOKING_TYPE = 'HALL';
    
    /**
     * Booking number prefix (HLBD for Development, HLBL for Live)
     */
    const BOOKING_PREFIX_DEV = 'HLBD';
    const BOOKING_PREFIX_LIVE = 'HLBL';
    
    /**
     * Payment reference prefix (PYD for Development, PYL for Live)
     */
    const PAYMENT_PREFIX_DEV = 'PYD';
    const PAYMENT_PREFIX_LIVE = 'PYL';

    /**
     * Item Type Constants
     */
    const ITEM_TYPE_SESSION = 'HALL_SESSION';
    const ITEM_TYPE_SERVICES = 'HALL_SERVICES';

    // ========================================
    // MASTER DATA ENDPOINTS
    // ========================================

    /**
     * Get active venues
     * GET /api/v1/hall-booking/venues
     */
    public function getVenues()
    {
        try {
            $venues = VenueMaster::active()
                ->orderBy('venue_name')
                ->get()
                ->map(function ($venue) {
                    return [
                        'id' => $venue->id,
                        'name' => $venue->venue_name,
                        'name_chinese' => $venue->venue_name_chinese,
                        'description' => $venue->description,
                        'description_chinese' => $venue->description_chinese,
                        'location' => $venue->location,
                        'capacity' => $venue->capacity,
                        'area_sqft' => (float) $venue->area_sqft,
                        'facilities' => $venue->facilities,
                        'facilities_chinese' => $venue->facilities_chinese,
                    ];
                });

            return response()->json([
                'success' => true,
                'data' => $venues
            ]);

        } catch (\Exception $e) {
            Log::error('Failed to fetch venues', ['error' => $e->getMessage()]);
            return response()->json([
                'success' => false,
                'message' => 'Failed to fetch venues'
            ], 500);
        }
    }

    /**
     * Get active sessions
     * GET /api/v1/hall-booking/sessions
     */
    public function getSessions()
    {
        try {
            $sessions = SessionMaster::active()
                ->orderBy('start_time')
                ->get()
                ->map(function ($session) {
                    return [
                        'id' => $session->id,
                        'name' => $session->session_name,
                        'name_chinese' => $session->session_name_chinese,
                        'description' => $session->description,
                        'description_chinese' => $session->description_chinese,
                        'start_time' => $session->start_time,
                        'end_time' => $session->end_time,
                        'duration_hours' => (float) $session->duration_hours,
                        'duration_formatted' => $session->duration_formatted,
                        'amount' => (float) $session->amount,
                        'amount_formatted' => $session->amount_formatted,
                    ];
                });

            return response()->json([
                'success' => true,
                'data' => $sessions
            ]);

        } catch (\Exception $e) {
            Log::error('Failed to fetch sessions', ['error' => $e->getMessage()]);
            return response()->json([
                'success' => false,
                'message' => 'Failed to fetch sessions'
            ], 500);
        }
    }

    /**
     * Get packages
     * GET /api/v1/hall-booking/packages
     */
    public function getPackages()
    {
        try {
            $packages = PackageMaster::active()
                ->orderBy('package_name')
                ->get()
                ->map(function ($package) {
                    return [
                        'id' => $package->id,
                        'name' => $package->package_name,
                        'name_chinese' => $package->package_name_chinese,
                        'description' => $package->description,
                        'description_chinese' => $package->description_chinese,
                        'number_of_people' => $package->number_of_people,
                        'amount' => (float) $package->amount,
                        'amount_formatted' => $package->amount_formatted,
                        'includes' => $package->includes,
                        'includes_chinese' => $package->includes_chinese,
                        'price_per_person' => $package->price_per_person,
                    ];
                });

            return response()->json([
                'success' => true,
                'data' => $packages
            ]);

        } catch (\Exception $e) {
            Log::error('Failed to fetch packages', ['error' => $e->getMessage()]);
            return response()->json([
                'success' => false,
                'message' => 'Failed to fetch packages'
            ], 500);
        }
    }

    /**
     * Get addon groups with services
     * GET /api/v1/hall-booking/addon-groups
     */
    public function getAddonGroups()
    {
        try {
            $groups = AddonGroup::active()
                ->ordered()
                ->with(['activeServices' => function ($query) {
                    $query->orderBy('service_name');
                }])
                ->get()
                ->map(function ($group) {
                    return [
                        'id' => $group->id,
                        'name' => $group->group_name,
                        'name_chinese' => $group->group_name_chinese,
                        'description' => $group->description,
                        'description_chinese' => $group->description_chinese,
                        'icon' => $group->icon,
                        'display_order' => $group->display_order,
                        'services' => $group->activeServices->map(function ($service) {
                            return [
                                'id' => $service->id,
                                'name' => $service->service_name,
                                'name_chinese' => $service->service_name_chinese,
                                'description' => $service->description,
                                'description_chinese' => $service->description_chinese,
                                'unit' => $service->unit,
                                'internal_amount' => (float) $service->internal_amount,
                                'external_amount' => (float) $service->external_amount,
                                'internal_amount_formatted' => $service->internal_amount_formatted,
                                'external_amount_formatted' => $service->external_amount_formatted,
                            ];
                        }),
                    ];
                });

            return response()->json([
                'success' => true,
                'data' => $groups
            ]);

        } catch (\Exception $e) {
            Log::error('Failed to fetch addon groups', ['error' => $e->getMessage()]);
            return response()->json([
                'success' => false,
                'message' => 'Failed to fetch addon groups'
            ], 500);
        }
    }

    /**
     * Get all master data in single request (for initial page load)
     * GET /api/v1/hall-booking/masters
     */
    public function getMasterData()
    {
        try {
            // Get venues
            $venues = VenueMaster::active()
                ->orderBy('venue_name')
                ->get()
                ->map(function ($venue) {
                    return [
                        'id' => $venue->id,
                        'name' => $venue->venue_name,
                        'name_chinese' => $venue->venue_name_chinese,
                        'description' => $venue->description,
                        'location' => $venue->location,
                        'capacity' => $venue->capacity,
                        'area_sqft' => (float) $venue->area_sqft,
                        'facilities' => $venue->facilities,
                    ];
                });

            // Get sessions
            $sessions = SessionMaster::active()
                ->orderBy('start_time')
                ->get()
                ->map(function ($session) {
                    return [
                        'id' => $session->id,
                        'name' => $session->session_name,
                        'name_chinese' => $session->session_name_chinese,
                        'start_time' => $session->start_time,
                        'end_time' => $session->end_time,
                        'duration_hours' => (float) $session->duration_hours,
                        'amount' => (float) $session->amount,
                    ];
                });

            // Get packages
            $packages = PackageMaster::active()
                ->orderBy('package_name')
                ->get()
                ->map(function ($package) {
                    return [
                        'id' => $package->id,
                        'name' => $package->package_name,
                        'name_chinese' => $package->package_name_chinese,
                        'description' => $package->description,
                        'number_of_people' => $package->number_of_people,
                        'amount' => (float) $package->amount,
                        'includes' => $package->includes,
                    ];
                });

            // Get addon groups with services
            $addonGroups = AddonGroup::active()
                ->ordered()
                ->with(['activeServices' => function ($query) {
                    $query->orderBy('service_name');
                }])
                ->get()
                ->map(function ($group) {
                    return [
                        'id' => $group->id,
                        'name' => $group->group_name,
                        'name_chinese' => $group->group_name_chinese,
                        'icon' => $group->icon,
                        'services' => $group->activeServices->map(function ($service) {
                            return [
                                'id' => $service->id,
                                'name' => $service->service_name,
                                'name_chinese' => $service->service_name_chinese,
                                'unit' => $service->unit,
                                'internal_amount' => (float) $service->internal_amount,
                                'external_amount' => (float) $service->external_amount,
                            ];
                        }),
                    ];
                });

            // Get payment modes (using existing endpoint pattern)
            $paymentModes = PaymentMode::where('status', 1)
                ->orderBy('name')
                ->get()
                ->map(function ($mode) {
                    return [
                        'id' => $mode->id,
                        'name' => $mode->name,
                        'icon_display_url_data' => $mode->icon_display_url_data,
                    ];
                });

            return response()->json([
                'success' => true,
                'data' => [
                    'venues' => $venues,
                    'sessions' => $sessions,
                    'packages' => $packages,
                    'addon_groups' => $addonGroups,
                    'payment_modes' => $paymentModes,
                ]
            ]);

        } catch (\Exception $e) {
            Log::error('Failed to fetch master data', ['error' => $e->getMessage()]);
            return response()->json([
                'success' => false,
                'message' => 'Failed to fetch master data'
            ], 500);
        }
    }

    /**
     * Check venue availability for a specific date
     * POST /api/v1/hall-booking/check-availability
     */
    public function checkAvailability(Request $request)
    {
        try {
            $validator = Validator::make($request->all(), [
                'venue_id' => 'required|exists:venue_master,id',
                'date' => 'required|date',
            ]);

            if ($validator->fails()) {
                return response()->json([
                    'success' => false,
                    'message' => 'Validation failed',
                    'errors' => $validator->errors()
                ], 422);
            }

            $venueId = $request->input('venue_id');
            $date = Carbon::parse($request->input('date'))->format('Y-m-d');

            // Get booked sessions for this venue and date
            $bookedSessions = BookingItem::whereHas('booking', function ($query) use ($venueId) {
                    $query->where('booking_type', self::BOOKING_TYPE)
                          ->whereIn('booking_status', ['PENDING', 'CONFIRMED'])
                          ->whereHas('meta', function ($metaQuery) use ($venueId) {
                              $metaQuery->where('meta_key', 'venue_id')
                                        ->where('meta_value', $venueId);
                          });
                })
                ->where('item_type', self::ITEM_TYPE_SESSION)
                ->where('service_date', $date)
                ->pluck('item_id')
                ->toArray();

            // Get all active sessions and mark availability
            $sessions = SessionMaster::active()
                ->orderBy('start_time')
                ->get()
                ->map(function ($session) use ($bookedSessions) {
                    return [
                        'id' => $session->id,
                        'name' => $session->session_name,
                        'start_time' => $session->start_time,
                        'end_time' => $session->end_time,
                        'amount' => (float) $session->amount,
                        'is_available' => !in_array($session->id, $bookedSessions),
                    ];
                });

            return response()->json([
                'success' => true,
                'data' => [
                    'date' => $date,
                    'venue_id' => $venueId,
                    'sessions' => $sessions,
                ]
            ]);

        } catch (\Exception $e) {
            Log::error('Failed to check availability', ['error' => $e->getMessage()]);
            return response()->json([
                'success' => false,
                'message' => 'Failed to check availability'
            ], 500);
        }
    }

    // ========================================
    // BOOKING CRUD OPERATIONS
    // ========================================

    /**
     * Store a new Hall Booking
     * POST /api/v1/hall-booking/bookings
     */
    public function store(Request $request)
    {
        // Validate request
        $validator = Validator::make($request->all(), [
            // Booking details
            'venue_id' => 'required|exists:venue_master,id',
            'booking_date' => 'required|date|after_or_equal:today',
            'sessions' => 'required|array|min:1',
            'sessions.*.id' => 'required|exists:session_master,id',
            'package_type' => 'required|in:standard,package',
            'package_id' => 'nullable|required_if:package_type,package|exists:package_master,id',
            
            // Add-ons
            'addons' => 'nullable|array',
            'addons.*.id' => 'required_with:addons|exists:addon_services,id',
            'addons.*.quantity' => 'required_with:addons|integer|min:1',
            
            // Extra charges
            'extra_charges' => 'nullable|array',
            'extra_charges.*.description' => 'required_with:extra_charges|string|max:255',
            'extra_charges.*.amount' => 'required_with:extra_charges|numeric|min:0',
            
            // Personal information
            'nric' => 'required|string|max:50',
            'name_primary' => 'required|string|max:255',
            'name_secondary' => 'nullable|string|max:255',
            'email' => 'required|email|max:255',
            'phone_no' => 'required|string|max:50',
            'special_requirements' => 'nullable|string',
            
            // Payment
            'print_option' => 'required|in:NO_PRINT,SINGLE_PRINT',
            'payment_mode_id' => 'required|exists:payment_modes,id',
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
            $user = $request->user();
            $isLive = config('app.env') === 'production';
            
            // ========================================
            // SERVER-SIDE PRICE CALCULATION (Security)
            // ========================================
            
            // Get venue
            $venue = VenueMaster::findOrFail($request->input('venue_id'));
            
            // Get sessions from database and calculate total
            $sessionIds = collect($request->input('sessions'))->pluck('id')->toArray();
            $sessions = SessionMaster::whereIn('id', $sessionIds)->get();
            $sessionsTotal = $sessions->sum('amount');
            
            // Get package if selected
            $package = null;
            $packageTotal = 0;
            $packageType = $request->input('package_type');
            if ($packageType === 'package' && $request->input('package_id')) {
                $package = PackageMaster::find($request->input('package_id'));
                $packageTotal = $package ? (float) $package->amount : 0;
            }
            
            // Calculate addons total from database prices
            $addons = [];
            $addonsTotal = 0;
            if ($request->has('addons') && is_array($request->input('addons'))) {
                foreach ($request->input('addons') as $addonInput) {
                    $addonService = AddonService::find($addonInput['id']);
                    if ($addonService) {
                        $quantity = (int) $addonInput['quantity'];
                        $unitPrice = (float) $addonService->internal_amount;
                        $total = $unitPrice * $quantity;
                        
                        $addons[] = [
                            'service' => $addonService,
                            'quantity' => $quantity,
                            'unit_price' => $unitPrice,
                            'total' => $total,
                        ];
                        $addonsTotal += $total;
                    }
                }
            }
            
            // Calculate extra charges total
            $extraCharges = $request->input('extra_charges', []);
            $extraChargesTotal = collect($extraCharges)->sum('amount');
            
            // Calculate total amount (server-side)
            $totalAmount = $sessionsTotal + $packageTotal + $addonsTotal + $extraChargesTotal;
            
            // ========================================
            // CREATE BOOKING
            // ========================================
            
            $bookingNumber = $this->generateBookingNumber($isLive);
            $paymentMode = PaymentMode::find($request->input('payment_mode_id'));
            
            $booking = Booking::create([
                'booking_number' => $bookingNumber,
                'booking_type' => self::BOOKING_TYPE,
                'devotee_id' => null,
                'booking_date' => Carbon::parse($request->input('booking_date')),
                'booking_status' => 'CONFIRMED',
                'payment_status' => 'FULL',
                'subtotal' => $totalAmount,
                'tax_amount' => 0,
                'discount_amount' => 0,
                'deposit_amount' => 0,
                'total_amount' => $totalAmount,
                'paid_amount' => $totalAmount,
                'payment_method' => $paymentMode ? $paymentMode->name : null,
                'print_option' => $request->input('print_option'),
                'special_instructions' => $request->input('special_requirements'),
                'booking_through' => 'COUNTER',
                'created_by' => $user->id,
            ]);

            // ========================================
            // CREATE BOOKING META
            // ========================================
            
            $metaRecords = [
                ['meta_key' => 'venue_id', 'meta_value' => $venue->id, 'meta_type' => 'INTEGER'],
                ['meta_key' => 'venue_name', 'meta_value' => $venue->venue_name, 'meta_type' => 'STRING'],
                ['meta_key' => 'venue_name_chinese', 'meta_value' => $venue->venue_name_chinese ?? '', 'meta_type' => 'STRING'],
                ['meta_key' => 'package_type', 'meta_value' => $packageType, 'meta_type' => 'STRING'],
                ['meta_key' => 'nric', 'meta_value' => $request->input('nric'), 'meta_type' => 'STRING'],
                ['meta_key' => 'name_primary', 'meta_value' => $request->input('name_primary'), 'meta_type' => 'STRING'],
                ['meta_key' => 'name_secondary', 'meta_value' => $request->input('name_secondary') ?? '', 'meta_type' => 'STRING'],
                ['meta_key' => 'email', 'meta_value' => $request->input('email'), 'meta_type' => 'STRING'],
                ['meta_key' => 'phone_no', 'meta_value' => $request->input('phone_no'), 'meta_type' => 'STRING'],
                ['meta_key' => 'special_requirements', 'meta_value' => $request->input('special_requirements') ?? '', 'meta_type' => 'STRING'],
            ];

            // Add extra charges to meta as JSON
            if (!empty($extraCharges)) {
                $metaRecords[] = [
                    'meta_key' => 'extra_charges',
                    'meta_value' => json_encode($extraCharges),
                    'meta_type' => 'JSON'
                ];
                $metaRecords[] = [
                    'meta_key' => 'extra_charges_total',
                    'meta_value' => $extraChargesTotal,
                    'meta_type' => 'DECIMAL'
                ];
            }

            foreach ($metaRecords as $meta) {
                BookingMeta::create([
                    'booking_id' => $booking->id,
                    'meta_key' => $meta['meta_key'],
                    'meta_value' => $meta['meta_value'],
                    'meta_type' => $meta['meta_type'],
                    'created_at' => now(),
                ]);
            }

            // ========================================
            // CREATE BOOKING ITEMS
            // ========================================
            
            // Type 1: HALL_SESSION (multiple rows if multiple sessions selected)
            foreach ($sessions as $session) {
                $bookingItem = BookingItem::create([
                    'booking_id' => $booking->id,
                    'item_type' => self::ITEM_TYPE_SESSION,
                    'item_id' => $session->id,
                    'item_name' => $session->session_name,
                    'item_name_secondary' => $session->session_name_chinese,
                    'service_date' => Carbon::parse($request->input('booking_date')),
                    'quantity' => 1,
                    'unit_price' => $session->amount,
                    'total_price' => $session->amount,
                    'status' => 'PENDING',
                    'add_ons' => 0,
                ]);

                // Store session meta in booking_item_meta
                BookingItemMeta::create([
                    'booking_item_id' => $bookingItem->id,
                    'meta_key' => 'start_time',
                    'meta_value' => $session->start_time,
                    'meta_type' => 'STRING',
                    'created_at' => now(),
                ]);
                BookingItemMeta::create([
                    'booking_item_id' => $bookingItem->id,
                    'meta_key' => 'end_time',
                    'meta_value' => $session->end_time,
                    'meta_type' => 'STRING',
                    'created_at' => now(),
                ]);
                BookingItemMeta::create([
                    'booking_item_id' => $bookingItem->id,
                    'meta_key' => 'duration_hours',
                    'meta_value' => $session->duration_hours,
                    'meta_type' => 'DECIMAL',
                    'created_at' => now(),
                ]);
            }

            // Type 2: HALL_SERVICES (package) - add_ons = 0
            if ($package) {
                $packageItem = BookingItem::create([
                    'booking_id' => $booking->id,
                    'item_type' => self::ITEM_TYPE_SERVICES,
                    'item_id' => $package->id,
                    'item_name' => $package->package_name,
                    'item_name_secondary' => $package->package_name_chinese,
                    'service_date' => Carbon::parse($request->input('booking_date')),
                    'quantity' => 1,
                    'unit_price' => $package->amount,
                    'total_price' => $package->amount,
                    'status' => 'PENDING',
                    'add_ons' => 0,
                ]);

                BookingItemMeta::create([
                    'booking_item_id' => $packageItem->id,
                    'meta_key' => 'number_of_people',
                    'meta_value' => $package->number_of_people,
                    'meta_type' => 'INTEGER',
                    'created_at' => now(),
                ]);
                BookingItemMeta::create([
                    'booking_item_id' => $packageItem->id,
                    'meta_key' => 'includes',
                    'meta_value' => $package->includes ?? '',
                    'meta_type' => 'STRING',
                    'created_at' => now(),
                ]);
            }

            // Type 3: HALL_SERVICES (addon services) - add_ons = 1
            foreach ($addons as $addon) {
                $addonItem = BookingItem::create([
                    'booking_id' => $booking->id,
                    'item_type' => self::ITEM_TYPE_SERVICES,
                    'item_id' => $addon['service']->id,
                    'item_name' => $addon['service']->service_name,
                    'item_name_secondary' => $addon['service']->service_name_chinese,
                    'service_date' => Carbon::parse($request->input('booking_date')),
                    'quantity' => $addon['quantity'],
                    'unit_price' => $addon['unit_price'],
                    'total_price' => $addon['total'],
                    'status' => 'PENDING',
                    'add_ons' => 1,
                ]);

                BookingItemMeta::create([
                    'booking_item_id' => $addonItem->id,
                    'meta_key' => 'unit',
                    'meta_value' => $addon['service']->unit ?? '',
                    'meta_type' => 'STRING',
                    'created_at' => now(),
                ]);
                BookingItemMeta::create([
                    'booking_item_id' => $addonItem->id,
                    'meta_key' => 'addon_group_id',
                    'meta_value' => $addon['service']->addon_group_id,
                    'meta_type' => 'INTEGER',
                    'created_at' => now(),
                ]);
            }

            // ========================================
            // CREATE BOOKING PAYMENT
            // ========================================
            
            $paymentReference = $this->generatePaymentReference($isLive);
            
            BookingPayment::create([
                'booking_id' => $booking->id,
                'payment_date' => now(),
                'amount' => $totalAmount,
                'payment_mode_id' => $request->input('payment_mode_id'),
                'payment_method' => $paymentMode ? $paymentMode->name : null,
                'payment_reference' => $paymentReference,
                'payment_type' => 'FULL',
                'payment_status' => 'SUCCESS',
                'created_by' => $user->id,
            ]);

            DB::commit();

            // Load relationships for response
            $booking->load(['items.meta', 'meta', 'payments']);

            return response()->json([
                'success' => true,
                'message' => 'Hall booking created successfully',
                'data' => $this->formatBookingResponse($booking)
            ], 201);

        } catch (\Exception $e) {
            DB::rollBack();
            
            Log::error('Hall booking creation failed', [
                'error' => $e->getMessage(),
                'trace' => $e->getTraceAsString(),
                'request' => $request->all()
            ]);

            return response()->json([
                'success' => false,
                'message' => 'Failed to create booking: ' . $e->getMessage(),
                'error' => config('app.debug') ? $e->getMessage() : 'An error occurred'
            ], 500);
        }
    }

    /**
     * Get a single Hall Booking
     * GET /api/v1/hall-booking/bookings/{id}
     */
    public function show($id)
    {
        try {
            $booking = Booking::with(['items.meta', 'meta', 'payments', 'creator'])
                ->where(function($query) use ($id) {
                    $query->where('id', $id)
                          ->orWhere('booking_number', $id);
                })
                ->where('booking_type', self::BOOKING_TYPE)
                ->first();

            if (!$booking) {
                return response()->json([
                    'success' => false,
                    'message' => 'Booking not found'
                ], 404);
            }

            return response()->json([
                'success' => true,
                'data' => $this->formatBookingResponse($booking)
            ]);

        } catch (\Exception $e) {
            Log::error('Failed to fetch Hall booking', [
                'id' => $id,
                'error' => $e->getMessage()
            ]);

            return response()->json([
                'success' => false,
                'message' => 'Failed to fetch booking'
            ], 500);
        }
    }

    /**
     * Get all Hall Bookings with pagination
     * GET /api/v1/hall-booking/bookings
     */
    public function index(Request $request)
    {
        try {
            $perPage = $request->input('per_page', 15);
            $status = $request->input('status');
            $paymentStatus = $request->input('payment_status');
            $fromDate = $request->input('from_date');
            $toDate = $request->input('to_date');
            $search = $request->input('search');
            $venueId = $request->input('venue_id');

            $query = Booking::with(['items', 'meta', 'payments', 'creator'])
                ->where('booking_type', self::BOOKING_TYPE)
                ->orderBy('created_at', 'desc');

            if ($status) {
                $query->where('booking_status', $status);
            }

            if ($paymentStatus) {
                $query->where('payment_status', $paymentStatus);
            }

            if ($fromDate) {
                $query->whereDate('booking_date', '>=', $fromDate);
            }

            if ($toDate) {
                $query->whereDate('booking_date', '<=', $toDate);
            }

            if ($search) {
                $query->where(function($q) use ($search) {
                    $q->where('booking_number', 'LIKE', "%{$search}%")
                      ->orWhereHas('meta', function($metaQuery) use ($search) {
                          $metaQuery->whereIn('meta_key', ['name_primary', 'name_secondary', 'email', 'phone_no', 'nric'])
                                    ->where('meta_value', 'LIKE', "%{$search}%");
                      });
                });
            }

            if ($venueId) {
                $query->whereHas('meta', function($metaQuery) use ($venueId) {
                    $metaQuery->where('meta_key', 'venue_id')
                              ->where('meta_value', $venueId);
                });
            }

            $bookings = $query->paginate($perPage);

            $formattedBookings = $bookings->getCollection()->map(function($booking) {
                return $this->formatBookingResponse($booking);
            });

            return response()->json([
                'success' => true,
                'data' => $formattedBookings,
                'pagination' => [
                    'current_page' => $bookings->currentPage(),
                    'last_page' => $bookings->lastPage(),
                    'per_page' => $bookings->perPage(),
                    'total' => $bookings->total()
                ]
            ]);

        } catch (\Exception $e) {
            Log::error('Failed to fetch Hall bookings', ['error' => $e->getMessage()]);
            return response()->json([
                'success' => false,
                'message' => 'Failed to fetch bookings'
            ], 500);
        }
    }

    /**
     * Cancel a Hall Booking
     * POST /api/v1/hall-booking/bookings/{id}/cancel
     */
    public function cancel($id, Request $request)
    {
        try {
            $booking = Booking::where('id', $id)
                ->where('booking_type', self::BOOKING_TYPE)
                ->first();

            if (!$booking) {
                return response()->json([
                    'success' => false,
                    'message' => 'Booking not found'
                ], 404);
            }

            if ($booking->booking_status === 'CANCELLED') {
                return response()->json([
                    'success' => false,
                    'message' => 'Booking is already cancelled'
                ], 400);
            }

            if ($booking->booking_status === 'COMPLETED') {
                return response()->json([
                    'success' => false,
                    'message' => 'Cannot cancel a completed booking'
                ], 400);
            }

            $booking->update([
                'booking_status' => 'CANCELLED',
                'updated_at' => now()
            ]);

            $booking->items()->update(['status' => 'CANCELLED']);

            return response()->json([
                'success' => true,
                'message' => 'Booking cancelled successfully',
                'data' => $this->formatBookingResponse($booking->fresh(['items.meta', 'meta', 'payments']))
            ]);

        } catch (\Exception $e) {
            Log::error('Failed to cancel Hall booking', [
                'id' => $id,
                'error' => $e->getMessage()
            ]);

            return response()->json([
                'success' => false,
                'message' => 'Failed to cancel booking'
            ], 500);
        }
    }

    // ========================================
    // HELPER METHODS
    // ========================================

    private function generateBookingNumber($isLive = false)
    {
        $prefix = $isLive ? self::BOOKING_PREFIX_LIVE : self::BOOKING_PREFIX_DEV;
        $date = Carbon::now()->format('Ymd');
        
        $lastBooking = Booking::where('booking_number', 'LIKE', $prefix . $date . '%')
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

    private function generatePaymentReference($isLive = false)
    {
        $prefix = $isLive ? self::PAYMENT_PREFIX_LIVE : self::PAYMENT_PREFIX_DEV;
        $date = Carbon::now()->format('Ymd');
        
        $lastPayment = BookingPayment::where('payment_reference', 'LIKE', $prefix . $date . '%')
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

    private function formatBookingResponse($booking)
    {
        $metaData = [];
        if ($booking->meta) {
            foreach ($booking->meta as $meta) {
                if ($meta->meta_type === 'JSON') {
                    $metaData[$meta->meta_key] = json_decode($meta->meta_value, true);
                } else {
                    $metaData[$meta->meta_key] = $meta->meta_value;
                }
            }
        }

        $venue = null;
        if (isset($metaData['venue_id'])) {
            $venue = [
                'id' => (int) $metaData['venue_id'],
                'name' => $metaData['venue_name'] ?? null,
                'name_chinese' => $metaData['venue_name_chinese'] ?? null,
            ];
        }

        $sessions = [];
        $package = null;
        $addons = [];

        if ($booking->items) {
            foreach ($booking->items as $item) {
                $itemMeta = [];
                if ($item->meta) {
                    foreach ($item->meta as $meta) {
                        $itemMeta[$meta->meta_key] = $meta->meta_value;
                    }
                }

                $itemData = [
                    'id' => $item->id,
                    'item_id' => $item->item_id,
                    'name' => $item->item_name,
                    'name_secondary' => $item->item_name_secondary,
                    'quantity' => $item->quantity,
                    'unit_price' => (float) $item->unit_price,
                    'total_price' => (float) $item->total_price,
                    'status' => $item->status,
                    'meta' => $itemMeta,
                ];

                if ($item->item_type === self::ITEM_TYPE_SESSION) {
                    $sessions[] = $itemData;
                } elseif ($item->item_type === self::ITEM_TYPE_SERVICES && $item->add_ons == 0) {
                    $package = $itemData;
                } elseif ($item->item_type === self::ITEM_TYPE_SERVICES && $item->add_ons == 1) {
                    $addons[] = $itemData;
                }
            }
        }

        $latestPayment = $booking->payments ? $booking->payments->first() : null;

        return [
            'id' => $booking->id,
            'booking_number' => $booking->booking_number,
            'booking_type' => self::BOOKING_TYPE,
            'booking_date' => $booking->booking_date ? $booking->booking_date->format('Y-m-d') : null,
            'booking_status' => $booking->booking_status,
            'payment_status' => $booking->payment_status,
            'total_amount' => (float) $booking->total_amount,
            'paid_amount' => (float) $booking->paid_amount,
            'print_option' => $booking->print_option,
            'venue' => $venue,
            'sessions' => $sessions,
            'package' => $package,
            'package_type' => $metaData['package_type'] ?? 'standard',
            'addons' => $addons,
            'extra_charges' => $metaData['extra_charges'] ?? [],
            'nric' => $metaData['nric'] ?? null,
            'name_primary' => $metaData['name_primary'] ?? null,
            'name_secondary' => $metaData['name_secondary'] ?? null,
            'email' => $metaData['email'] ?? null,
            'phone_no' => $metaData['phone_no'] ?? null,
            'special_requirements' => $metaData['special_requirements'] ?? $booking->special_instructions,
            'payment' => $latestPayment ? [
                'id' => $latestPayment->id,
                'amount' => (float) $latestPayment->amount,
                'payment_reference' => $latestPayment->payment_reference,
                'payment_method' => $latestPayment->payment_method,
                'payment_status' => $latestPayment->payment_status,
                'payment_date' => $latestPayment->payment_date ? Carbon::parse($latestPayment->payment_date)->format('Y-m-d H:i:s') : null,
            ] : null,
            'created_at' => $booking->created_at ? $booking->created_at->format('Y-m-d H:i:s') : null,
            'updated_at' => $booking->updated_at ? $booking->updated_at->format('Y-m-d H:i:s') : null,
            'created_by' => $booking->creator ? [
                'id' => $booking->creator->id,
                'name' => $booking->creator->name ?? $booking->creator->username,
            ] : null,
        ];
    }
}