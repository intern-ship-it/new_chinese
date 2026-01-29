<?php

namespace App\Http\Controllers;

use App\Http\Controllers\Controller;
use App\Models\Booking;
use App\Models\BookingMeta;
use App\Models\BookingPayment;
use App\Models\BookingItem;
use App\Models\PaymentMode;
use App\Models\BuddhaLampMaster;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Log;
use Illuminate\Support\Facades\Validator;
use Carbon\Carbon;

class BuddhaLampController extends Controller
{
    /**
     * Booking type constant
     */
    const BOOKING_TYPE = 'BUDDHA_LAMP';
    
    /**
     * Booking number prefix (BLBD for Development, BLBL for Live)
     */
    const BOOKING_PREFIX_DEV = 'BLBD';
    const BOOKING_PREFIX_LIVE = 'BLBL';
    
    /**
     * Payment reference prefix (PYD for Development, PYL for Live)
     */
    const PAYMENT_PREFIX_DEV = 'PYD';
    const PAYMENT_PREFIX_LIVE = 'PYL';

    /**
     * Get active Buddha Lamp masters for selection
     *
     * @return \Illuminate\Http\JsonResponse
     */
    public function getActiveMasters()
    {
        try {
            $masters = BuddhaLampMaster::where('status', '1')->select('*')
                ->get();

            return response()->json([
                'success' => true,
                'data' => $masters
            ]);

        } catch (\Exception $e) {
            Log::error('Failed to fetch Buddha Lamp masters', [
                'error' => $e->getMessage()
            ]);

            return response()->json([
                'success' => false,
                'message' => 'Failed to fetch Buddha Lamp types'
            ], 500);
        }
    }

    /**
     * Store a new Buddha Lamp booking
     *
     * @param Request $request
     * @return \Illuminate\Http\JsonResponse
     */
    public function store(Request $request)
    {
        // Validate request - buddha_lamp_master_id is now optional for custom amounts
        $validator = Validator::make($request->all(), [
            'booking_type' => 'required|string',
            'booking_date' => 'required|date',
            'buddha_lamp_master_id' => 'nullable|exists:buddha_lamp_masters,id', // Changed to nullable
            'subtotal' => 'nullable|numeric|min:0', // Subtotal before discount
            'discount_amount' => 'nullable|numeric|min:0', // Discount amount
            'total_amount' => 'required|numeric|min:0.01', // Final total after discount
            'paid_amount' => 'required|numeric|min:0.01',
            'print_option' => 'required|in:NO_PRINT,SINGLE_PRINT,SEP_PRINT',
            'special_instructions' => 'nullable|string',
            
            // Meta validation
            'meta.nric' => 'required|string|max:50',
            'meta.name_primary' => 'required|string|max:255',
            'meta.name_secondary' => 'nullable|string|max:255',
            'meta.email' => 'required|email|max:255',
            'meta.phone_no' => 'required|string|max:50',
            'meta.additional_notes' => 'nullable|string',
            
            // Payment validation
            'payment.amount' => 'required|numeric|min:0.01',
            'payment.payment_mode_id' => 'required|exists:payment_modes,id',
            'payment.payment_type' => 'required|in:FULL,SPLIT,DEPOSIT,PARTIAL',
            'payment.payment_status' => 'required|in:PENDING,SUCCESS,FAILED',
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
            
            // Get Buddha Lamp Master details if provided
            $buddhaLampMaster = null;
            $buddhaLampName = 'Custom Amount Buddha Lamp'; // Default name for custom amounts
            
            if ($request->has('buddha_lamp_master_id') && $request->input('buddha_lamp_master_id')) {
                $buddhaLampMaster = BuddhaLampMaster::findOrFail($request->input('buddha_lamp_master_id'));
                $buddhaLampName = $buddhaLampMaster->name_primary;
            }
            
            // Calculate amounts
            $subtotal = $request->input('subtotal', $request->input('total_amount'));
            $discountAmount = $request->input('discount_amount', 0);
            $totalAmount = $request->input('total_amount');
            $paidAmount = $request->input('paid_amount');
            
            // Generate booking number
            $bookingNumber = $this->generateBookingNumber($isLive);
            
            // Get payment mode for reference
            $paymentMode = PaymentMode::find($request->input('payment.payment_mode_id'));
            
            // Determine booking and payment status
            $paymentStatus = $this->determinePaymentStatus($paidAmount, $totalAmount);
            
            Log::info('Creating Buddha Lamp booking', [
                'booking_number' => $bookingNumber,
                'user_id' => $user->id,
                'subtotal' => $subtotal,
                'discount_amount' => $discountAmount,
                'total_amount' => $totalAmount,
                'paid_amount' => $paidAmount,
            ]);
            
            // Create booking record
            $booking = Booking::create([
                'booking_number' => $bookingNumber,
                'booking_type' => self::BOOKING_TYPE,
                'devotee_id' => null, // Can be linked later if devotee registration exists
                'booking_date' => Carbon::parse($request->input('booking_date')),
                'booking_status' => 'CONFIRMED', // Direct confirmation for Buddha Lamp
                'payment_status' => $paymentStatus,
                'subtotal' => $subtotal,
                'tax_amount' => 0,
                'discount_amount' => $discountAmount, // Save discount amount
                'deposit_amount' => 0,
                'total_amount' => $totalAmount,
                'paid_amount' => $paidAmount,
                'account_migration' => 0,
                'payment_method' => $paymentMode ? $paymentMode->name : null,
                'print_option' => $request->input('print_option'),
                'special_instructions' => $request->input('special_instructions'),
                'created_by' => $user->id,
                'user_id' => $user->id,
            ]);

            Log::info('Booking created', ['booking_id' => $booking->id]);

            // Create booking meta records
            $metaData = $request->input('meta');
            $metaRecords = [
                ['meta_key' => 'booking_type', 'meta_value' => self::BOOKING_TYPE, 'meta_type' => 'STRING'],
                ['meta_key' => 'buddha_lamp_master_id', 'meta_value' => $buddhaLampMaster ? $buddhaLampMaster->id : 'custom', 'meta_type' => 'STRING'],
                ['meta_key' => 'buddha_lamp_name', 'meta_value' => $buddhaLampName, 'meta_type' => 'STRING'],
                ['meta_key' => 'is_custom_amount', 'meta_value' => $buddhaLampMaster ? 'false' : 'true', 'meta_type' => 'STRING'],
                ['meta_key' => 'nric', 'meta_value' => $metaData['nric'], 'meta_type' => 'STRING'],
                ['meta_key' => 'name_primary', 'meta_value' => $metaData['name_primary'], 'meta_type' => 'STRING'],
                ['meta_key' => 'name_secondary', 'meta_value' => $metaData['name_secondary'] ?? '', 'meta_type' => 'STRING'],
                ['meta_key' => 'email', 'meta_value' => $metaData['email'], 'meta_type' => 'STRING'],
                ['meta_key' => 'phone_no', 'meta_value' => $metaData['phone_no'], 'meta_type' => 'STRING'],
                ['meta_key' => 'additional_notes', 'meta_value' => $metaData['additional_notes'] ?? '', 'meta_type' => 'STRING'],
            ];

            foreach ($metaRecords as $meta) {
                BookingMeta::create([
                    'booking_id' => $booking->id,
                    'meta_key' => $meta['meta_key'],
                    'meta_value' => $meta['meta_value'],
                    'meta_type' => $meta['meta_type'],
                    'created_at' => now(),
                ]);
            }

            Log::info('Booking metadata created');

            // Create booking item record
            // Note: item_id is set to NULL because it's bigint type in DB
            // The actual master ID is stored in booking_meta
            BookingItem::create([
                'booking_id' => $booking->id,
                'item_type' => self::BOOKING_TYPE,
                'item_id' => null, // Set to NULL as the column is bigint, not UUID
                'item_name' => $buddhaLampName,
                'item_description' => $buddhaLampMaster ? $buddhaLampMaster->description_primary : 'Custom amount Buddha Lamp offering',
                'quantity' => 1,
                'unit_price' => $subtotal,
                'subtotal' => $subtotal,
                'tax_amount' => 0,
                'discount_amount' => $discountAmount,
                'total_price' => $totalAmount,
                'status' => 'SUCCESS',
                'created_at' => now(),
            ]);

            Log::info('Booking item created');

            // Generate payment reference
            $paymentReference = $this->generatePaymentReference($isLive);
            
            // Create payment record
            $paymentData = $request->input('payment');
            $payment = BookingPayment::create([
                'booking_id' => $booking->id,
                'payment_date' => now(),
                'amount' => $paymentData['amount'],
                'payment_mode_id' => $paymentData['payment_mode_id'],
                'payment_method' => $paymentMode ? $paymentMode->name : null,
                'payment_reference' => $paymentReference,
                'payment_type' => $paymentData['payment_type'],
                'payment_status' => $paymentData['payment_status'],
                'created_by' => $user->id,
            ]);

            Log::info('Payment record created', ['payment_id' => $payment->id]);

            // Account Migration
            $this->accountMigration($booking->id, $buddhaLampMaster);

            DB::commit();

            // Load relationships for response
            $booking->load(['meta', 'payments', 'items']);

            Log::info('Buddha Lamp booking created successfully', ['booking_id' => $booking->id]);

            // Format response data
            $responseData = $this->formatBookingResponse($booking);

            return response()->json([
                'success' => true,
                'message' => 'Buddha Lamp booking created successfully',
                'data' => $responseData
            ], 201);

        } catch (\Exception $e) {
            DB::rollBack();
            
            Log::error('Buddha Lamp booking creation failed', [
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
     * Account Migration
     * This method creates accounting entries for Buddha Lamp transactions
     */
    protected function accountMigration($bookingId, $buddhaLampMaster = null)
    {
        try {
            Log::info('Starting account migration', ['booking_id' => $bookingId]);

            // Get booking details
            $booking = Booking::with(['payments.paymentMode', 'meta'])
                ->findOrFail($bookingId);

            // Get payment details
            $payment = $booking->payments->first();
            if (!$payment) {
                throw new \Exception('No payment found for booking');
            }

            $paymentMode = $payment->paymentMode;
            if (!$paymentMode) {
                throw new \Exception('Payment mode not found');
            }

            // Check if payment mode has ledger_id
            if (empty($paymentMode->ledger_id)) {
                Log::warning('Payment mode does not have ledger_id', [
                    'payment_mode_id' => $paymentMode->id,
                    'payment_mode_name' => $paymentMode->name
                ]);
                throw new \Exception('Payment mode ledger configuration missing');
            }

            // Determine credit ledger (Income side)
            $creditLedgerId = null;

            // Check if Buddha Lamp Master has ledger_id
            if ($buddhaLampMaster && !empty($buddhaLampMaster->ledger_id)) {
                $creditLedgerId = $buddhaLampMaster->ledger_id;
            } else {
                // Get or create "All Incomes" ledger under Revenue group
                $incomesGroup = DB::table('groups')->where('code', '4000')->first();

                if (!$incomesGroup) {
                    // Create Incomes group if it doesn't exist
                    $incomesGroupId = DB::table('groups')->insertGetId([
                        'parent_id' => 0,
                        'name' => 'Revenue',
                        'code' => '4000',
                        'added_by' => auth()->id(),
                        'created_at' => now(),
                        'updated_at' => now()
                    ]);
                } else {
                    $incomesGroupId = $incomesGroup->id;
                }

                // Get or create "All Revenue" ledger
                $allIncomesLedger = DB::table('ledgers')
                    ->where('name', 'All Revenue')
                    ->where('group_id', $incomesGroupId)
                    ->first();

                if (!$allIncomesLedger) {
                    // Get the next right_code for this group
                    $lastRightCode = DB::table('ledgers')
                        ->where('group_id', $incomesGroupId)
                        ->where('left_code', '4000')
                        ->orderBy('right_code', 'desc')
                        ->value('right_code');

                    $newRightCode = str_pad(((int)$lastRightCode + 1), 4, '0', STR_PAD_LEFT);

                    $creditLedgerId = DB::table('ledgers')->insertGetId([
                        'group_id' => $incomesGroupId,
                        'name' => 'All Revenue',
                        'left_code' => '4000',
                        'right_code' => $newRightCode,
                        'created_at' => now(),
                        'updated_at' => now()
                    ]);
                } else {
                    $creditLedgerId = $allIncomesLedger->id;
                }
            }

            // Debit ledger is from payment mode
            $debitLedgerId = $paymentMode->ledger_id;

            // Generate entry code
            $date = $booking->booking_date;
            $year = $date->format('y');
            $month = $date->format('m');

            // Get last entry code for the month
            $lastEntry = DB::table('entries')
                ->whereYear('date', $date->format('Y'))
                ->whereMonth('date', $month)
                ->where('entrytype_id', 1) // Receipt entry type
                ->orderBy('id', 'desc')
                ->first();

            $lastNumber = 0;
            if ($lastEntry && !empty($lastEntry->entry_code)) {
                $lastNumber = (int)substr($lastEntry->entry_code, -5);
            }

            $entryCode = 'REC' . $year . $month . str_pad($lastNumber + 1, 5, '0', STR_PAD_LEFT);

            // Get next entry number
            $lastEntryNumber = DB::table('entries')
                ->where('entrytype_id', 1)
                ->orderBy('id', 'desc')
                ->value('number');

            $entryNumber = $lastEntryNumber ? (int)$lastEntryNumber + 1 : 1;

            // Get metadata for narration
            $meta = $booking->meta->pluck('meta_value', 'meta_key');
            $devoteName = $meta['name_primary'] ?? 'Unknown';
            $devoteNric = $meta['nric'] ?? '';
            $devoteEmail = $meta['email'] ?? '';
            $buddhaLampName = $meta['buddha_lamp_name'] ?? 'Buddha Lamp';

            // Prepare narration
            $narration = "Buddha Lamp Booking ({$booking->booking_number})\n";
            $narration .= "Type: {$buddhaLampName}\n";
            $narration .= "Name: {$devoteName}\n";
            if ($devoteNric) {
                $narration .= "NRIC: {$devoteNric}\n";
            }
            if ($devoteEmail) {
                $narration .= "Email: {$devoteEmail}\n";
            }
            
            // Add discount info to narration if applicable
            if ($booking->discount_amount > 0) {
                $narration .= "Discount: " . number_format($booking->discount_amount, 2) . "\n";
            }
			
			$discountLedgerId = null;
			if ($booking->discount_amount > 0) {
                // Get discount ledger from booking_settings
                $discountSetting = DB::table('booking_settings')
                    ->where('key', 'discount_ledger_id')
                    ->first();

                if ($discountSetting && !empty($discountSetting->value)) {
                    $discountLedgerId = (int)$discountSetting->value;
                } else {
                    // Get or create default Discount ledger
                    $discountLedgerId = $this->getOrCreateDiscountLedger();
                }

                Log::info('Discount entry prepared', [
                    'ledger_id' => $discountLedgerId,
                    'amount' => $booking->discount_amount
                ]);
            }
			
            // Calculate totals for entry
            // When there's a discount:
            // - Credit to Income = subtotal (original amount before discount)
            // - Debit to Discount = discount_amount (expense)
            // - Debit to Payment Mode = paid_amount (actual money received)
            $subtotalAmount = $booking->subtotal ?? ($booking->total_amount + $booking->discount_amount);
            $drTotal = $booking->paid_amount + $booking->discount_amount;
            $crTotal = $subtotalAmount;
            
            // Create entry
            $entryId = DB::table('entries')->insertGetId([
                'entrytype_id' => 1, // Receipt type
                'number' => $entryCode,
                'date' => $date,
                'dr_total' => $drTotal,
                'cr_total' => $crTotal,
                'narration' => $narration,
                'inv_id' => $bookingId,
                'inv_type' => 4, // Buddha Lamp type (you may need to adjust this based on your system)
                'entry_code' => $entryCode,
                'created_by' => auth()->id(),
                'user_id' => auth()->id(),
                'created_at' => now(),
                'updated_at' => now()
            ]);

            Log::info('Entry created', [
                'entry_id' => $entryId,
                'entry_code' => $entryCode,
                'dr_total' => $drTotal,
                'cr_total' => $crTotal
            ]);
			
			// ========================================
            // CREATE DISCOUNT DEBIT ENTRY (if applicable)
            // ========================================
            if ($booking->discount_amount > 0 && $discountLedgerId) {
                DB::table('entryitems')->insert([
                    'entry_id' => $entryId,
                    'ledger_id' => $discountLedgerId,
                    'amount' => $booking->discount_amount,
                    'details' => "Discount - Buddha Lamp Booking ({$booking->booking_number})",
                    'dc' => 'D', // Debit (expense)
                    'is_discount' => 1,
                    'created_at' => now(),
                    'updated_at' => now()
                ]);

                Log::info('Discount debit entry item created', [
                    'ledger_id' => $discountLedgerId,
                    'amount' => $booking->discount_amount
                ]);
            }

            // Create debit entry item (Payment mode ledger)
            DB::table('entryitems')->insert([
                'entry_id' => $entryId,
                'ledger_id' => $debitLedgerId,
                'amount' => $booking->paid_amount,
                'details' => "Buddha Lamp Booking ({$booking->booking_number})",
                'dc' => 'D', // Debit
                'created_at' => now(),
                'updated_at' => now()
            ]);

            Log::info('Debit entry item created', [
                'ledger_id' => $debitLedgerId,
                'amount' => $booking->paid_amount
            ]);

            // Create credit entry item (Income ledger) - credit the full subtotal
            DB::table('entryitems')->insert([
                'entry_id' => $entryId,
                'ledger_id' => $creditLedgerId,
                'amount' => $subtotalAmount,
                'details' => "Buddha Lamp Booking ({$booking->booking_number})",
                'dc' => 'C', // Credit
                'created_at' => now(),
                'updated_at' => now()
            ]);
            
            // Update booking to mark account migration as complete
            $booking->update(['account_migration' => 1]);

            Log::info('Credit entry item created', [
                'ledger_id' => $creditLedgerId,
                'amount' => $subtotalAmount
            ]);

            Log::info('Account migration completed successfully', [
                'booking_id' => $bookingId,
                'entry_id' => $entryId,
                'has_discount' => $booking->discount_amount > 0
            ]);

            return true;
        } catch (\Exception $e) {
            Log::error('Error in account migration: ' . $e->getMessage(), [
                'booking_id' => $bookingId,
                'trace' => $e->getTraceAsString()
            ]);
            throw $e;
        }
    }

    /**
     * Get a single Buddha Lamp booking
     *
     * @param string $id
     * @return \Illuminate\Http\JsonResponse
     */
    public function show($id)
    {
        try {
            $booking = Booking::with(['meta', 'payments', 'items', 'creator'])
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
            Log::error('Failed to fetch Buddha Lamp booking', [
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
     * Get all Buddha Lamp bookings with pagination
     *
     * @param Request $request
     * @return \Illuminate\Http\JsonResponse
     */
    public function index(Request $request)
    {
        try {
            $perPage = $request->input('per_page', 15);
            $search = $request->input('search');
            $status = $request->input('status');
            $dateFrom = $request->input('date_from');
            $dateTo = $request->input('date_to');

            $query = Booking::with(['meta', 'payments', 'items', 'creator'])
                ->where('booking_type', self::BOOKING_TYPE);

            // Apply filters
            if ($search) {
                $query->where(function($q) use ($search) {
                    $q->where('booking_number', 'LIKE', "%{$search}%")
                      ->orWhereHas('meta', function($mq) use ($search) {
                          $mq->whereIn('meta_key', ['name_primary', 'name_secondary', 'nric', 'email', 'phone_no'])
                             ->where('meta_value', 'LIKE', "%{$search}%");
                      });
                });
            }

            if ($status) {
                $query->where('booking_status', $status);
            }

            if ($dateFrom) {
                $query->whereDate('booking_date', '>=', $dateFrom);
            }

            if ($dateTo) {
                $query->whereDate('booking_date', '<=', $dateTo);
            }

            $bookings = $query->orderBy('created_at', 'desc')
                              ->paginate($perPage);

            // Format each booking
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
                    'total' => $bookings->total(),
                ]
            ]);

        } catch (\Exception $e) {
            Log::error('Failed to fetch Buddha Lamp bookings', [
                'error' => $e->getMessage()
            ]);

            return response()->json([
                'success' => false,
                'message' => 'Failed to fetch bookings'
            ], 500);
        }
    }

    /**
     * Update a Buddha Lamp booking
     *
     * @param Request $request
     * @param string $id
     * @return \Illuminate\Http\JsonResponse
     */
    public function update(Request $request, $id)
    {
        $validator = Validator::make($request->all(), [
            'booking_date' => 'sometimes|date',
            'booking_status' => 'sometimes|in:PENDING,CONFIRMED,COMPLETED,CANCELLED',
            'special_instructions' => 'nullable|string',
            'meta.nric' => 'sometimes|string|max:50',
            'meta.name_primary' => 'sometimes|string|max:255',
            'meta.name_secondary' => 'nullable|string|max:255',
            'meta.email' => 'sometimes|email|max:255',
            'meta.phone_no' => 'sometimes|string|max:50',
            'meta.additional_notes' => 'nullable|string',
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
            $booking = Booking::with(['meta'])
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

            // Update booking fields
            $updateData = [];
            if ($request->has('booking_date')) {
                $updateData['booking_date'] = Carbon::parse($request->input('booking_date'));
            }
            if ($request->has('booking_status')) {
                $updateData['booking_status'] = $request->input('booking_status');
            }
            if ($request->has('special_instructions')) {
                $updateData['special_instructions'] = $request->input('special_instructions');
            }

            if (!empty($updateData)) {
                $booking->update($updateData);
            }

            // Update meta records
            if ($request->has('meta')) {
                $metaData = $request->input('meta');
                foreach ($metaData as $key => $value) {
                    BookingMeta::updateOrCreate(
                        ['booking_id' => $booking->id, 'meta_key' => $key],
                        ['meta_value' => $value, 'meta_type' => 'STRING']
                    );
                }
            }

            DB::commit();

            // Reload relationships
            $booking->load(['meta', 'payments', 'items', 'creator']);

            return response()->json([
                'success' => true,
                'message' => 'Booking updated successfully',
                'data' => $this->formatBookingResponse($booking)
            ]);

        } catch (\Exception $e) {
            DB::rollBack();
            
            Log::error('Failed to update Buddha Lamp booking', [
                'id' => $id,
                'error' => $e->getMessage()
            ]);

            return response()->json([
                'success' => false,
                'message' => 'Failed to update booking'
            ], 500);
        }
    }

    /**
     * Cancel a Buddha Lamp booking
     *
     * @param string $id
     * @return \Illuminate\Http\JsonResponse
     */
    public function cancel($id)
    {
        try {
            $booking = Booking::where(function($query) use ($id) {
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

            if ($booking->booking_status === 'CANCELLED') {
                return response()->json([
                    'success' => false,
                    'message' => 'Booking is already cancelled'
                ], 400);
            }

            $booking->update([
                'booking_status' => 'CANCELLED',
                'updated_at' => now()
            ]);

            return response()->json([
                'success' => true,
                'message' => 'Booking cancelled successfully'
            ]);

        } catch (\Exception $e) {
            Log::error('Failed to cancel Buddha Lamp booking', [
                'id' => $id,
                'error' => $e->getMessage()
            ]);

            return response()->json([
                'success' => false,
                'message' => 'Failed to cancel booking'
            ], 500);
        }
    }

    /**
     * Generate booking number
     *
     * @param bool $isLive
     * @return string
     */
    private function generateBookingNumber($isLive = false)
    {
        $prefix = $isLive ? self::BOOKING_PREFIX_LIVE : self::BOOKING_PREFIX_DEV;
        $date = Carbon::now()->format('Ymd');
        
        // Get the last booking number for today
        $lastBooking = Booking::where('booking_number', 'LIKE', $prefix . $date . '%')
            ->orderBy('booking_number', 'desc')
            ->first();

        if ($lastBooking) {
            // Extract the sequence number and increment
            $lastNumber = (int) substr($lastBooking->booking_number, -8);
            $newNumber = $lastNumber + 1;
        } else {
            $newNumber = 1;
        }

        return $prefix . $date . str_pad($newNumber, 8, '0', STR_PAD_LEFT);
    }

    /**
     * Generate payment reference
     *
     * @param bool $isLive
     * @return string
     */
    private function generatePaymentReference($isLive = false)
    {
        $prefix = $isLive ? self::PAYMENT_PREFIX_LIVE : self::PAYMENT_PREFIX_DEV;
        $date = Carbon::now()->format('Ymd');
        
        // Get the last payment reference for today
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

    /**
     * Determine payment status based on paid amount
     *
     * @param float $paidAmount
     * @param float $totalAmount
     * @return string
     */
    private function determinePaymentStatus($paidAmount, $totalAmount)
    {
        if ($paidAmount <= 0) {
            return 'PENDING';
        } elseif ($paidAmount < $totalAmount) {
            return 'PARTIAL';
        } else {
            return 'FULL';
        }
    }

    /**
     * Format booking response
     *
     * @param Booking $booking
     * @return array
     */
    private function formatBookingResponse($booking)
    {
        // Convert meta to key-value pairs
        $metaData = [];
        if ($booking->meta) {
            foreach ($booking->meta as $meta) {
                $metaData[$meta->meta_key] = $meta->meta_value;
            }
        }

        // Get latest payment info
        $latestPayment = $booking->payments ? $booking->payments->first() : null;
        
        // Get booking item info
        $bookingItem = $booking->items ? $booking->items->first() : null;

        return [
            'id' => $booking->id,
            'booking_number' => $booking->booking_number,
            'booking_type' => $booking->booking_type ?? self::BOOKING_TYPE,
            'booking_date' => $booking->booking_date ? $booking->booking_date->format('Y-m-d') : null,
            'booking_status' => $booking->booking_status,
            'payment_status' => $booking->payment_status,
            'subtotal' => (float) $booking->subtotal,
            'discount_amount' => (float) $booking->discount_amount,
            'total_amount' => (float) $booking->total_amount,
            'paid_amount' => (float) $booking->paid_amount,
            'print_option' => $booking->print_option,
            'special_instructions' => $booking->special_instructions,
            
            // Buddha Lamp Master info
            'buddha_lamp_master_id' => $metaData['buddha_lamp_master_id'] ?? null,
            'buddha_lamp_name' => $metaData['buddha_lamp_name'] ?? null,
            'is_custom_amount' => ($metaData['is_custom_amount'] ?? 'false') === 'true',
            
            // Meta data
            'nric' => $metaData['nric'] ?? null,
            'name_primary' => $metaData['name_primary'] ?? null,
            'name_secondary' => $metaData['name_secondary'] ?? null,
            'email' => $metaData['email'] ?? null,
            'phone_no' => $metaData['phone_no'] ?? null,
            'additional_notes' => $metaData['additional_notes'] ?? null,
            
            // Booking Item info
            'item' => $bookingItem ? [
                'id' => $bookingItem->id,
                'item_id' => $bookingItem->item_id,
                'item_name' => $bookingItem->item_name,
                'item_description' => $bookingItem->item_description,
                'quantity' => $bookingItem->quantity,
                'unit_price' => (float) $bookingItem->unit_price,
                'discount_amount' => (float) ($bookingItem->discount_amount ?? 0),
                'total_price' => (float) ($bookingItem->total_price ?? $bookingItem->total_amount),
                'status' => $bookingItem->status,
            ] : null,
            
            // Payment info
            'payment' => $latestPayment ? [
                'id' => $latestPayment->id,
                'amount' => (float) $latestPayment->amount,
                'payment_reference' => $latestPayment->payment_reference,
                'payment_method' => $latestPayment->payment_method,
                'payment_mode_id' => $latestPayment->payment_mode_id,
                'payment_status' => $latestPayment->payment_status,
                'payment_date' => $latestPayment->payment_date ? $latestPayment->payment_date->format('Y-m-d H:i:s') : null,
            ] : null,
            
            // Timestamps
            'created_at' => $booking->created_at ? $booking->created_at->format('Y-m-d H:i:s') : null,
            'updated_at' => $booking->updated_at ? $booking->updated_at->format('Y-m-d H:i:s') : null,
            'created_by' => $booking->creator ? [
                'id' => $booking->creator->id,
                'name' => $booking->creator->name ?? $booking->creator->username,
            ] : null,
        ];
    }
	
	/**
     * Get or create Discount ledger
     * Creates under Expenses group (7000) if not exists
     *
     * @return int
     */
    private function getOrCreateDiscountLedger()
    {
        // Get or create "Expenses" group
        $expensesGroup = DB::table('groups')->where('code', '7000')->first();

        if (!$expensesGroup) {
            // Create Expenses group if it doesn't exist
            $expensesGroupId = DB::table('groups')->insertGetId([
                'parent_id' => 0,
                'name' => 'Expenses',
                'code' => '7000',
                'added_by' => auth()->id(),
                'created_at' => now(),
                'updated_at' => now()
            ]);
        } else {
            $expensesGroupId = $expensesGroup->id;
        }

        // Get or create "Discount Given" ledger
        $discountLedger = DB::table('ledgers')
            ->where('name', 'Discount Given')
            ->where('group_id', $expensesGroupId)
            ->first();

        if (!$discountLedger) {
            // Get the next right_code for this group
            $lastRightCode = DB::table('ledgers')
                ->where('group_id', $expensesGroupId)
                ->where('left_code', '7000')
                ->orderBy('right_code', 'desc')
                ->value('right_code');

            $newRightCode = $lastRightCode ? str_pad(((int)$lastRightCode + 1), 4, '0', STR_PAD_LEFT) : '0001';

            $discountLedgerId = DB::table('ledgers')->insertGetId([
                'group_id' => $expensesGroupId,
                'name' => 'Discount Given',
                'left_code' => '7000',
                'right_code' => $newRightCode,
                'type' => 0,
                'created_at' => now(),
                'updated_at' => now()
            ]);

            Log::info('Created Discount Given ledger', [
                'ledger_id' => $discountLedgerId,
                'group_id' => $expensesGroupId
            ]);
        } else {
            $discountLedgerId = $discountLedger->id;
        }

        return $discountLedgerId;
    }
}