<?php

namespace App\Http\Controllers;

use App\Models\Booking;
use App\Models\BookingItem;
use App\Models\BookingMeta;
use App\Models\BookingPayment;
use App\Models\DonationMaster;
use App\Models\PaymentMode;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Log;
use Illuminate\Support\Facades\Validator;
use Exception;

class DonationController extends Controller
{
    /**
     * Get active donation types
     */
    public function getActiveDonations()
    {
        try {
            $donations = DonationMaster::where('status', 1)
                ->whereNull('deleted_at')
      ->select('id', 'name', 'secondary_name', 'type', 'details', 'image_url', 'group_id')
                ->orderBy('name')
                ->get();
            return response()->json([
                'success' => true,
                'data' => $donations
            ]);
        } catch (Exception $e) {
            Log::error('Error fetching donation types: ' . $e->getMessage());
            return response()->json([
                'success' => false,
                'message' => 'Failed to fetch donation types'
            ], 500);
        }
    }

    /**
     * Get active payment modes
     */
    public function getActivePaymentModes()
    {
        try {
            $paymentModes = PaymentMode::where('status', 1)
                ->whereNull('deleted_at')
                ->select('id', 'name', 'icon', 'description')
                ->orderBy('name')
                ->get();

            return response()->json([
                'success' => true,
                'data' => $paymentModes
            ]);
        } catch (Exception $e) {
            Log::error('Error fetching payment modes: ' . $e->getMessage());
            return response()->json([
                'success' => false,
                'message' => 'Failed to fetch payment modes'
            ], 500);
        }
    }

    /**
     * Store a new donation
     */
    public function store(Request $request)
    {
        $isAnonymous = $request->input('is_anonymous', false);

        // Base validation rules
        $rules = [
            'donation_id' => 'required|string',
            'amount' => 'required|numeric|min:0.01',
            'payment_mode_id' => 'required|integer|exists:payment_modes,id',
            'notes' => 'nullable|string',
            'print_option' => 'nullable|in:NO_PRINT,SINGLE_PRINT',
            'is_anonymous' => 'nullable|boolean',
            // Pledge fields
            'is_pledge' => 'nullable|boolean',
            'pledge_amount' => 'nullable|numeric|min:0.01',
            // Booking channel field
            'booking_through' => 'nullable|in:ADMIN,COUNTER,APP,KIOSK,ONLINE',
        ];

        // Make personal info optional if anonymous
        if (!$isAnonymous) {
            $rules['name_chinese'] = 'required|string|max:255';
            $rules['contact_no'] = 'required|string|max:50';
            $rules['name_english'] = 'nullable|string|max:255';
            $rules['nric'] = 'nullable|string|max:50';
            $rules['email'] = 'nullable|email|max:255';
        } else {
            $rules['name_chinese'] = 'nullable|string|max:255';
            $rules['contact_no'] = 'nullable|string|max:50';
            $rules['name_english'] = 'nullable|string|max:255';
            $rules['nric'] = 'nullable|string|max:50';
            $rules['email'] = 'nullable|email|max:255';
        }

        $validator = Validator::make($request->all(), $rules);

        if ($validator->fails()) {
            Log::warning('Donation validation failed', ['errors' => $validator->errors()]);
            return response()->json([
                'success' => false,
                'message' => 'Validation failed',
                'errors' => $validator->errors()
            ], 422);
        }

        // Additional validation for pledge
        if ($request->input('is_pledge', false)) {
            if (!$request->has('pledge_amount') || $request->pledge_amount <= 0) {
                return response()->json([
                    'success' => false,
                    'message' => 'Pledge amount is required when donation is marked as pledge',
                    'errors' => ['pledge_amount' => ['Pledge amount must be greater than 0']]
                ], 422);
            }

            if ($request->pledge_amount < $request->amount) {
                return response()->json([
                    'success' => false,
                    'message' => 'Pledge amount must be greater than or equal to initial payment',
                    'errors' => ['pledge_amount' => ['Pledge amount must be >= initial payment amount']]
                ], 422);
            }
        }

        DB::beginTransaction();

        try {
            $user = auth()->user();
            $isPledge = $request->input('is_pledge', false);
            $pledgeAmount = $request->input('pledge_amount', 0);
            $isAnonymous = $request->input('is_anonymous', false);

            // Get booking_through value, default to ADMIN if not provided
            $bookingThrough = $request->input('booking_through', 'ADMIN');

            // Get donation details
            $donation = DonationMaster::find($request->donation_id);

            if (!$donation) {
                throw new Exception('Donation type not found');
            }

            // Generate booking number
            $bookingNumber = $this->generateBookingNumber('DONATION');
            $paymentMode = PaymentMode::find($request->payment_mode_id);
            // Generate payment reference
            $paymentReference = $this->generatePaymentReference();

            Log::info('Creating donation booking', [
                'booking_number' => $bookingNumber,
                'user_id' => $user->id,
                'amount' => $request->amount,
                'is_pledge' => $isPledge,
                'pledge_amount' => $pledgeAmount,
                'is_anonymous' => $isAnonymous,
                'booking_through' => $bookingThrough,
            ]);

            // Determine booking and payment status based on pledge
            if ($isPledge) {
                $bookingStatus = 'CONFIRMED';
                $paymentStatus = ($request->amount >= $pledgeAmount) ? 'FULL' : 'PARTIAL';
                $totalAmount = $pledgeAmount;
            } else {
                $bookingStatus = 'CONFIRMED';
                $paymentStatus = 'FULL';
                $totalAmount = $request->amount;
            }

            // Create booking with booking_through
            $booking = Booking::create([
                'booking_number' => $bookingNumber,
                'booking_type' => 'DONATION',
                'booking_date' => now(),
                'booking_status' => $bookingStatus,
                'payment_status' => $paymentStatus,
                'subtotal' => $totalAmount,
                'tax_amount' => 0,
                'discount_amount' => 0,
                'total_amount' => $totalAmount,
                'paid_amount' => $request->amount,
                'account_migration' => 0,
                'deposit_amount' => 0,
                'print_option' => $request->print_option ?? 'SINGLE_PRINT',
                'payment_method' => $paymentMode ? $paymentMode->name : null,
                'special_instructions' => $request->notes,
                'booking_through' => $bookingThrough, // Set booking_through
                'created_by' => $user->id
            ]);

            Log::info('Booking created', [
                'booking_id' => $booking->id,
                'booking_through' => $bookingThrough
            ]);

            // Create booking item
            BookingItem::create([
                'booking_id' => $booking->id,
                'item_type' => 'DONATION',
                'item_id' => null,
                'item_name' => $donation->name,
                'item_name_secondary' => $donation->secondary_name,
                'service_date' => now()->toDateString(),
                'service_time' => null,
                'quantity' => 1,
                'unit_price' => $totalAmount,
                'total_price' => $totalAmount,
                'status' => 'SUCCESS',
                'notes' => $request->notes
            ]);

            Log::info('Booking item created');

            // Store metadata
            $metaData = [
                'donation_type' => $donation->type,
                'donation_name' => $donation->name,
                'donation_id' => $donation->id,
                'is_anonymous' => $isAnonymous ? 'true' : 'false',
            ];

            // Add personal info only if not anonymous
            if (!$isAnonymous) {
                $metaData['nric'] = $request->nric ?? '';
                $metaData['name_primary'] = $request->name_english ?? '';
                $metaData['name_secondary'] = $request->name_chinese ?? '';
                $metaData['email'] = $request->email ?? '';
                $metaData['phone_no'] = $request->contact_no ?? '';
            } else {
                $metaData['nric'] = '';
                $metaData['name_primary'] = 'Anonymous Donor';
                $metaData['name_secondary'] = '匿名捐赠者';
                $metaData['email'] = '';
                $metaData['phone_no'] = '';
            }

            // Pledge metadata
            $metaData['is_pledge'] = $isPledge ? 'true' : 'false';

            if ($isPledge) {
                $metaData['pledge_amount'] = $pledgeAmount;
                $metaData['pledge_balance'] = $pledgeAmount - $request->amount;
                $metaData['pledge_status'] = ($request->amount >= $pledgeAmount) ? 'FULFILLED' : 'PENDING';
            }

            foreach ($metaData as $key => $value) {
                BookingMeta::create([
                    'booking_id' => $booking->id,
                    'meta_key' => $key,
                    'meta_value' => (string)$value,
                    'meta_type' => 'string',
                    'created_at' => now(),
                ]);
            }

            Log::info('Booking metadata created');

            // Create payment record with paid_through
            $payment = BookingPayment::create([
                'booking_id' => $booking->id,
                'payment_date' => now(),
                'amount' => $request->amount,
                'payment_mode_id' => $request->payment_mode_id,
                'payment_reference' => $paymentReference,
                'payment_type' => ($isPledge && $request->amount < $pledgeAmount) ? 'SPLIT' : 'FULL',
                'payment_method' => $paymentMode ? $paymentMode->name : null,
                'payment_status' => 'SUCCESS',
                'notes' => $isPledge ? 'Initial pledge payment' : $request->notes,
                'paid_through' => $bookingThrough, // Set paid_through same as booking_through
                'created_by' => $user->id
            ]);

            Log::info('Payment record created', [
                'payment_id' => $payment->id,
                'paid_through' => $bookingThrough
            ]);

            // Account Migration
            $this->accountMigration($booking->id);

            DB::commit();

            // Load relationships for response
            $booking->load(['bookingItems', 'bookingPayments.paymentMode', 'bookingMeta', 'createdBy']);

            Log::info('Donation created successfully', ['booking_id' => $booking->id]);

            // Determine success message
            $message = 'Donation recorded successfully';
            if ($isAnonymous && $isPledge) {
                $message = 'Anonymous pledge donation recorded successfully';
            } elseif ($isAnonymous) {
                $message = 'Anonymous donation recorded successfully';
            } elseif ($isPledge) {
                $message = 'Pledge donation recorded successfully';
            }

            return response()->json([
                'success' => true,
                'message' => $message,
                'data' => [
                    'booking' => $this->formatDonationResponse($booking),
                    'booking_number' => $bookingNumber,
                    'payment_reference' => $paymentReference,
                    'is_pledge' => $isPledge,
                    'pledge_amount' => $pledgeAmount,
                    'is_anonymous' => $isAnonymous,
                    'booking_through' => $bookingThrough,
                ]
            ], 201);
        } catch (Exception $e) {
            DB::rollBack();
            Log::error('Error creating donation: ' . $e->getMessage());
            Log::error('Stack trace: ' . $e->getTraceAsString());

            return response()->json([
                'success' => false,
                'message' => 'Failed to record donation: ' . $e->getMessage(),
                'error' => config('app.debug') ? [
                    'message' => $e->getMessage(),
                    'file' => $e->getFile(),
                    'line' => $e->getLine()
                ] : null
            ], 500);
        }
    }

    /**
     * Account Migration
     * This method creates accounting entries for donation transactions
     */
    protected function accountMigration($bookingId)
    {
        try {
            Log::info('Starting account migration', ['booking_id' => $bookingId]);

            // Get booking details
            $booking = Booking::with(['bookingPayments.paymentMode', 'bookingMeta'])
                ->findOrFail($bookingId);

            // Get payment details
            $payment = $booking->bookingPayments->first();
            if (!$payment) {
                throw new Exception('No payment found for booking');
            }

            $paymentMode = $payment->paymentMode;
            if (!$paymentMode) {
                throw new Exception('Payment mode not found');
            }

            // Check if payment mode has ledger_id
            if (empty($paymentMode->ledger_id)) {
                Log::warning('Payment mode does not have ledger_id', [
                    'payment_mode_id' => $paymentMode->id,
                    'payment_mode_name' => $paymentMode->name
                ]);
                throw new Exception('Payment mode ledger configuration missing');
            }

            // Get donation metadata
            $meta = $booking->bookingMeta->pluck('meta_value', 'meta_key');
            $donationId = $meta['donation_id'] ?? null;

            if (!$donationId) {
                throw new Exception('Donation ID not found in metadata');
            }

            // Get donation details for credit ledger
            $donation = DonationMaster::find($donationId);
            if (!$donation) {
                throw new Exception('Donation type not found');
            }

            // Determine credit ledger (Income side)
            $creditLedgerId = null;

            if (!empty($donation->ledger_id)) {
                $creditLedgerId = $donation->ledger_id;
            } else {
                // Get or create "All Incomes" ledger under Incomes group
                $incomesGroup = DB::table('groups')->where('code', '8000')->first();

                if (!$incomesGroup) {
                    // Create Incomes group if it doesn't exist
                    $incomesGroupId = DB::table('groups')->insertGetId([
                        'parent_id' => 0,
                        'name' => 'Incomes',
                        'code' => '8000',
                        'added_by' => auth()->id(),
                        'created_at' => now(),
                        'updated_at' => now()
                    ]);
                } else {
                    $incomesGroupId = $incomesGroup->id;
                }

                // Get or create "All Incomes" ledger
                $allIncomesLedger = DB::table('ledgers')
                    ->where('name', 'All Incomes')
                    ->where('group_id', $incomesGroupId)
                    ->first();

                if (!$allIncomesLedger) {
                    // Get the next right_code for this group
                    $lastRightCode = DB::table('ledgers')
                        ->where('group_id', $incomesGroupId)
                        ->where('left_code', '8000')
                        ->orderBy('right_code', 'desc')
                        ->value('right_code');

                    $newRightCode = str_pad(((int)$lastRightCode + 1), 4, '0', STR_PAD_LEFT);

                    $creditLedgerId = DB::table('ledgers')->insertGetId([
                        'group_id' => $incomesGroupId,
                        'name' => 'All Incomes',
                        'left_code' => '8000',
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

            // Prepare narration
            $donorName = $meta['name_primary'] ?? 'Anonymous';
            $donorNric = $meta['nric'] ?? '';
            $donorEmail = $meta['email'] ?? '';

            $narration = "Cash Donation ({$booking->booking_number})\n";
            $narration .= "Name: {$donorName}\n";
            if ($donorNric) {
                $narration .= "NRIC: {$donorNric}\n";
            }
            if ($donorEmail) {
                $narration .= "Email: {$donorEmail}\n";
            }

            // Create entry
            $entryId = DB::table('entries')->insertGetId([
                'entrytype_id' => 1, // Receipt type
                'number' => $entryCode,
                'date' => $date,
                'dr_total' => $booking->paid_amount,
                'cr_total' => $booking->paid_amount,
                'narration' => $narration,
                'inv_id' => $bookingId,
                'inv_type' => 2, // Donation type
                'entry_code' => $entryCode,
                'created_by' => auth()->id(),
                'created_at' => now(),
                'updated_at' => now()
            ]);

            Log::info('Entry created', [
                'entry_id' => $entryId,
                'entry_code' => $entryCode
            ]);

            // Create debit entry item (Payment mode ledger)
            DB::table('entryitems')->insert([
                'entry_id' => $entryId,
                'ledger_id' => $debitLedgerId,
                'amount' => $booking->paid_amount,
                'details' => "Cash Donation ({$booking->booking_number})",
                'dc' => 'D', // Debit
                'created_at' => now(),
                'updated_at' => now()
            ]);

            Log::info('Debit entry item created', [
                'ledger_id' => $debitLedgerId,
                'amount' => $booking->paid_amount
            ]);

            // Create credit entry item (Income ledger)
            DB::table('entryitems')->insert([
                'entry_id' => $entryId,
                'ledger_id' => $creditLedgerId,
                'amount' => $booking->paid_amount,
                'details' => "Cash Donation ({$booking->booking_number})",
                'dc' => 'C', // Credit
                'created_at' => now(),
                'updated_at' => now()
            ]);
     $booking->update(['account_migration' => 1]);
            Log::info('Credit entry item created', [
                'ledger_id' => $creditLedgerId,
                'amount' => $booking->paid_amount
            ]);

            Log::info('Account migration completed successfully', [
                'booking_id' => $bookingId,
                'entry_id' => $entryId
            ]);

            return true;
        } catch (Exception $e) {
            Log::error('Error in account migration: ' . $e->getMessage(), [
                'booking_id' => $bookingId,
                'trace' => $e->getTraceAsString()
            ]);
            throw $e;
        }
    }

    /**
     * Get donation list with filters
     */
    public function index(Request $request)
    {
        try {
            $perPage = $request->input('per_page', 25);
            $page = $request->input('page', 1);

            $query = Booking::where('booking_type', 'DONATION')
                ->with(['bookingItems', 'bookingPayments.paymentMode', 'bookingMeta', 'createdBy']);

            // Apply filters
            if ($request->has('donation_type')) {
                $query->whereHas('bookingMeta', function ($q) use ($request) {
                    $q->where('meta_key', 'donation_type')
                        ->where('meta_value', $request->donation_type);
                });
            }

            if ($request->has('payment_mode_id')) {
                $query->whereHas('bookingPayments', function ($q) use ($request) {
                    $q->where('payment_mode_id', $request->payment_mode_id);
                });
            }

            if ($request->has('from_date')) {
                $query->whereDate('booking_date', '>=', $request->from_date);
            }

            if ($request->has('to_date')) {
                $query->whereDate('booking_date', '<=', $request->to_date);
            }

            // Filter by booking_through
            if ($request->has('booking_through')) {
                $query->where('booking_through', $request->booking_through);
            }

            // Filter by pledge status
            if ($request->has('pledge_status')) {
                $pledgeStatus = $request->pledge_status;
                if ($pledgeStatus === 'pledge_only') {
                    $query->whereHas('bookingMeta', function ($q) {
                        $q->where('meta_key', 'is_pledge')
                            ->where('meta_value', 'true');
                    });
                } elseif ($pledgeStatus === 'non_pledge') {
                    $query->whereHas('bookingMeta', function ($q) {
                        $q->where('meta_key', 'is_pledge')
                            ->where('meta_value', 'false');
                    });
                }
            }

            // Filter by anonymous status
            if ($request->has('anonymous_status')) {
                $anonymousStatus = $request->anonymous_status;
                if ($anonymousStatus === 'anonymous_only') {
                    $query->whereHas('bookingMeta', function ($q) {
                        $q->where('meta_key', 'is_anonymous')
                            ->where('meta_value', 'true');
                    });
                } elseif ($anonymousStatus === 'non_anonymous') {
                    $query->whereHas('bookingMeta', function ($q) {
                        $q->where('meta_key', 'is_anonymous')
                            ->where('meta_value', 'false');
                    });
                }
            }

            if ($request->has('search')) {
                $search = $request->search;
                $query->where(function ($q) use ($search) {
                    $q->where('booking_number', 'like', "%$search%")
                        ->orWhereHas('bookingMeta', function ($mq) use ($search) {
                            $mq->where('meta_key', 'name_primary')
                                ->where('meta_value', 'like', "%$search%");
                        })
                        ->orWhereHas('bookingMeta', function ($mq) use ($search) {
                            $mq->where('meta_key', 'name_secondary')
                                ->where('meta_value', 'like', "%$search%");
                        });
                });
            }

            $donations = $query->orderBy('booking_date', 'desc')
                ->paginate($perPage, ['*'], 'page', $page);

            // Format the response
            $donations->getCollection()->transform(function ($booking) {
                return $this->formatDonationResponse($booking);
            });

            return response()->json([
                'success' => true,
                'data' => $donations->items(),
                'pagination' => [
                    'current_page' => $donations->currentPage(),
                    'per_page' => $donations->perPage(),
                    'total' => $donations->total(),
                    'last_page' => $donations->lastPage()
                ]
            ]);
        } catch (Exception $e) {
            Log::error('Error fetching donations: ' . $e->getMessage());
            return response()->json([
                'success' => false,
                'message' => 'Failed to fetch donations'
            ], 500);
        }
    }

    /**
     * Get single donation details
     */
    public function show($id)
    {
        try {
            $booking = Booking::where('booking_type', 'DONATION')
                ->with(['bookingItems', 'bookingPayments.paymentMode', 'bookingMeta', 'createdBy'])
                ->findOrFail($id);

            return response()->json([
                'success' => true,
                'data' => $this->formatDonationResponse($booking)
            ]);
        } catch (Exception $e) {
            Log::error('Error fetching donation: ' . $e->getMessage());
            return response()->json([
                'success' => false,
                'message' => 'Donation not found'
            ], 404);
        }
    }

    /**
     * Get payment history for a donation
     */
    public function getPayments($id)
    {
        try {
            $booking = Booking::where('booking_type', 'DONATION')->findOrFail($id);

            $payments = BookingPayment::where('booking_id', $booking->id)
                ->with('paymentMode')
                ->orderBy('payment_date', 'desc')
                ->get();

            return response()->json([
                'success' => true,
                'data' => $payments
            ]);
        } catch (Exception $e) {
            Log::error('Error fetching payment history: ' . $e->getMessage());
            return response()->json([
                'success' => false,
                'message' => 'Failed to fetch payment history'
            ], 404);
        }
    }

    /**
     * Record a partial payment for a pledge donation
     */
    public function partialPayment(Request $request, $id)
    {
        $validator = Validator::make($request->all(), [
            'amount' => 'required|numeric|min:0.01',
            'payment_mode_id' => 'required|integer|exists:payment_modes,id',
            'notes' => 'nullable|string',
            'booking_through' => 'nullable|in:ADMIN,COUNTER,APP,KIOSK,ONLINE',
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
            $booking = Booking::where('booking_type', 'DONATION')
                ->findOrFail($id);

            // Check if it's a pledge
            $isPledgeMeta = $booking->bookingMeta()
                ->where('meta_key', 'is_pledge')
                ->where('meta_value', 'true')
                ->first();

            if (!$isPledgeMeta) {
                throw new Exception('This donation is not a pledge');
            }

            // Get current pledge data
            $pledgeAmount = (float) $booking->bookingMeta()
                ->where('meta_key', 'pledge_amount')
                ->value('meta_value');

            $currentPaid = $booking->paid_amount;
            $newPaidAmount = $currentPaid + $request->amount;

            // Check if payment exceeds pledge
            if ($newPaidAmount > $pledgeAmount) {
                throw new Exception('Payment amount exceeds remaining pledge balance');
            }

            $user = auth()->user();
            $paymentMode = PaymentMode::find($request->payment_mode_id);
            $paymentReference = $this->generatePaymentReference();

            // Get booking_through value
            // Use the value from request, or fallback to the booking's existing booking_through
            $bookingThrough = $request->input('booking_through', $booking->booking_through);

            Log::info('Recording partial payment', [
                'booking_id' => $booking->id,
                'booking_number' => $booking->booking_number,
                'amount' => $request->amount,
                'new_total_paid' => $newPaidAmount,
                'pledge_amount' => $pledgeAmount,
                'booking_through' => $bookingThrough,
            ]);

            // Create payment record with paid_through
            BookingPayment::create([
                'booking_id' => $booking->id,
                'payment_date' => now(),
                'amount' => $request->amount,
                'payment_mode_id' => $request->payment_mode_id,
                'payment_reference' => $paymentReference,
                'payment_type' => 'SPLIT',
                'payment_method' => $paymentMode ? $paymentMode->name : null,
                'payment_status' => 'SUCCESS',
                'notes' => $request->notes ?? 'Partial pledge payment',
                'paid_through' => $bookingThrough, // Set paid_through
                'created_by' => $user->id
            ]);

            // Update booking
            $newPaymentStatus = ($newPaidAmount >= $pledgeAmount) ? 'FULL' : 'PARTIAL';
            $booking->update([
                'paid_amount' => $newPaidAmount,
                'payment_status' => $newPaymentStatus,
                'updated_by' => $user->id
            ]);

            // Update pledge metadata
            $newBalance = $pledgeAmount - $newPaidAmount;
            $pledgeStatus = ($newBalance <= 0) ? 'FULFILLED' : 'PENDING';

            BookingMeta::updateOrCreate(
                ['booking_id' => $booking->id, 'meta_key' => 'pledge_balance'],
                ['meta_value' => (string) $newBalance, 'meta_type' => 'string']
            );

            BookingMeta::updateOrCreate(
                ['booking_id' => $booking->id, 'meta_key' => 'pledge_status'],
                ['meta_value' => $pledgeStatus, 'meta_type' => 'string']
            );

            // Account Migration for partial payment
            $this->accountMigrationPartialPayment($booking->id, $request->amount, $paymentMode);

            DB::commit();

            Log::info('Partial payment recorded successfully', [
                'booking_id' => $booking->id,
                'payment_reference' => $paymentReference,
                'paid_through' => $bookingThrough
            ]);

            return response()->json([
                'success' => true,
                'message' => 'Partial payment recorded successfully',
                'data' => [
                    'payment_reference' => $paymentReference,
                    'total_paid' => $newPaidAmount,
                    'remaining_balance' => $newBalance,
                    'pledge_status' => $pledgeStatus,
                    'is_fulfilled' => $pledgeStatus === 'FULFILLED',
                    'paid_through' => $bookingThrough,
                ]
            ]);
        } catch (Exception $e) {
            DB::rollBack();
            Log::error('Error recording partial payment: ' . $e->getMessage());

            return response()->json([
                'success' => false,
                'message' => $e->getMessage()
            ], 500);
        }
    }

    /**
     * Account Migration for Partial Payment
     */
    protected function accountMigrationPartialPayment($bookingId, $amount, $paymentMode)
    {
        try {
            Log::info('Starting account migration for partial payment', [
                'booking_id' => $bookingId,
                'amount' => $amount
            ]);

            $booking = Booking::with(['bookingMeta'])->findOrFail($bookingId);

            // Check if payment mode has ledger_id
            if (empty($paymentMode->ledger_id)) {
                Log::warning('Payment mode does not have ledger_id', [
                    'payment_mode_id' => $paymentMode->id,
                    'payment_mode_name' => $paymentMode->name
                ]);
                throw new Exception('Payment mode ledger configuration missing');
            }

            // Get donation metadata
            $meta = $booking->bookingMeta->pluck('meta_value', 'meta_key');
            $donationId = $meta['donation_id'] ?? null;

            if (!$donationId) {
                throw new Exception('Donation ID not found in metadata');
            }

            // Get donation details for credit ledger
            $donation = DonationMaster::find($donationId);
            if (!$donation) {
                throw new Exception('Donation type not found');
            }

            // Determine credit ledger (same as initial donation)
            $creditLedgerId = null;

            if (!empty($donation->ledger_id)) {
                $creditLedgerId = $donation->ledger_id;
            } else {
                // Get "All Incomes" ledger
                $incomesGroup = DB::table('groups')->where('code', '8000')->first();
                if ($incomesGroup) {
                    $allIncomesLedger = DB::table('ledgers')
                        ->where('name', 'All Incomes')
                        ->where('group_id', $incomesGroup->id)
                        ->first();

                    if ($allIncomesLedger) {
                        $creditLedgerId = $allIncomesLedger->id;
                    }
                }
            }

            if (!$creditLedgerId) {
                throw new Exception('Income ledger not found for donation type');
            }

            // Debit ledger is from payment mode
            $debitLedgerId = $paymentMode->ledger_id;

            // Generate entry code
            $date = now();
            $year = $date->format('y');
            $month = $date->format('m');

            // Get last entry code for the month
            $lastEntry = DB::table('entries')
                ->whereYear('date', $date->format('Y'))
                ->whereMonth('date', $month)
                ->where('entrytype_id', 1)
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

            // Prepare narration
            $donorName = $meta['name_primary'] ?? 'Anonymous';
            $narration = "Partial Pledge Payment ({$booking->booking_number})\n";
            $narration .= "Name: {$donorName}\n";
            $narration .= "Payment Amount: RM " . number_format($amount, 2);

            // Create entry
            $entryId = DB::table('entries')->insertGetId([
                'entrytype_id' => 1,
                'number' => $entryCode,
                'date' => $date,
                'dr_total' => $amount,
                'cr_total' => $amount,
                'narration' => $narration,
                'inv_id' => $bookingId,
                'inv_type' => 2, // Donation type
                'entry_code' => $entryCode,
                'created_by' => auth()->id(),
                'created_at' => now(),
                'updated_at' => now()
            ]);

            // Create debit entry item
            DB::table('entryitems')->insert([
                'entry_id' => $entryId,
                'ledger_id' => $debitLedgerId,
                'amount' => $amount,
                'details' => "Partial Pledge Payment ({$booking->booking_number})",
                'dc' => 'D',
                'created_at' => now(),
                'updated_at' => now()
            ]);

            // Create credit entry item
            DB::table('entryitems')->insert([
                'entry_id' => $entryId,
                'ledger_id' => $creditLedgerId,
                'amount' => $amount,
                'details' => "Partial Pledge Payment ({$booking->booking_number})",
                'dc' => 'C',
                'created_at' => now(),
                'updated_at' => now()
            ]);
         $booking->update(['account_migration' => 1]);
            Log::info('Account migration for partial payment completed', [
                'booking_id' => $bookingId,
                'entry_id' => $entryId,
                'amount' => $amount
            ]);

            return true;
        } catch (Exception $e) {
            Log::error('Error in partial payment account migration: ' . $e->getMessage(), [
                'booking_id' => $bookingId,
                'amount' => $amount
            ]);
            throw $e;
        }
    }

    /**
     * Get donation statistics
     */
    public function getStatistics(Request $request)
    {
        try {
            $today = now()->toDateString();
            $startOfMonth = now()->startOfMonth()->toDateString();

            $stats = [
                'today_donations' => Booking::where('booking_type', 'DONATION')
                    ->whereDate('booking_date', $today)
                    ->count(),
                'today_amount' => Booking::where('booking_type', 'DONATION')
                    ->whereDate('booking_date', $today)
                    ->sum('total_amount'),
                'month_donations' => Booking::where('booking_type', 'DONATION')
                    ->whereDate('booking_date', '>=', $startOfMonth)
                    ->count(),
                'month_amount' => Booking::where('booking_type', 'DONATION')
                    ->whereDate('booking_date', '>=', $startOfMonth)
                    ->sum('total_amount'),
                'total_donors' => Booking::where('booking_type', 'DONATION')
                    ->distinct('created_by')
                    ->count('created_by'),
                // Pledge statistics
                'total_pledges' => Booking::where('booking_type', 'DONATION')
                    ->whereHas('bookingMeta', function ($q) {
                        $q->where('meta_key', 'is_pledge')
                            ->where('meta_value', 'true');
                    })
                    ->count(),
                'active_pledges' => Booking::where('booking_type', 'DONATION')
                    ->whereHas('bookingMeta', function ($q) {
                        $q->where('meta_key', 'is_pledge')
                            ->where('meta_value', 'true');
                    })
                    ->whereHas('bookingMeta', function ($q) {
                        $q->where('meta_key', 'pledge_status')
                            ->where('meta_value', 'PENDING');
                    })
                    ->count(),
                'fulfilled_pledges' => Booking::where('booking_type', 'DONATION')
                    ->whereHas('bookingMeta', function ($q) {
                        $q->where('meta_key', 'is_pledge')
                            ->where('meta_value', 'true');
                    })
                    ->whereHas('bookingMeta', function ($q) {
                        $q->where('meta_key', 'pledge_status')
                            ->where('meta_value', 'FULFILLED');
                    })
                    ->count(),
                // Anonymous donations statistics
                'anonymous_donations' => Booking::where('booking_type', 'DONATION')
                    ->whereHas('bookingMeta', function ($q) {
                        $q->where('meta_key', 'is_anonymous')
                            ->where('meta_value', 'true');
                    })
                    ->count(),
                'anonymous_amount' => Booking::where('booking_type', 'DONATION')
                    ->whereHas('bookingMeta', function ($q) {
                        $q->where('meta_key', 'is_anonymous')
                            ->where('meta_value', 'true');
                    })
                    ->sum('total_amount'),
                // Booking channel statistics
                'admin_bookings' => Booking::where('booking_type', 'DONATION')
                    ->where('booking_through', 'ADMIN')
                    ->count(),
                'app_bookings' => Booking::where('booking_type', 'DONATION')
                    ->where('booking_through', 'APP')
                    ->count(),
                'kiosk_bookings' => Booking::where('booking_type', 'DONATION')
                    ->where('booking_through', 'KIOSK')
                    ->count(),
                'counter_bookings' => Booking::where('booking_type', 'DONATION')
                    ->where('booking_through', 'COUNTER')
                    ->count(),
                'online_bookings' => Booking::where('booking_type', 'DONATION')
                    ->where('booking_through', 'ONLINE')
                    ->count(),
            ];

            return response()->json([
                'success' => true,
                'data' => $stats
            ]);
        } catch (Exception $e) {
            Log::error('Error fetching statistics: ' . $e->getMessage());
            return response()->json([
                'success' => false,
                'message' => 'Failed to fetch statistics'
            ], 500);
        }
    }

    /**
     * Update a donation
     */
    public function update(Request $request, $id)
    {
        $isAnonymous = $request->input('is_anonymous', false);

        // Base validation rules
        $rules = [
            'donation_id' => 'required|string',
            'amount' => 'required|numeric|min:0.01',
            'payment_mode_id' => 'required|integer|exists:payment_modes,id',
            'notes' => 'nullable|string',
            'is_anonymous' => 'nullable|boolean',
            // Pledge fields
            'is_pledge' => 'nullable|boolean',
            'pledge_amount' => 'nullable|numeric|min:0.01',
            // Booking channel field
            'booking_through' => 'nullable|in:ADMIN,COUNTER,APP,KIOSK,ONLINE',
        ];

        // Make personal info optional if anonymous
        if (!$isAnonymous) {
            $rules['name_chinese'] = 'required|string|max:255';
            $rules['contact_no'] = 'required|string|max:50';
            $rules['name_english'] = 'nullable|string|max:255';
            $rules['nric'] = 'nullable|string|max:50';
            $rules['email'] = 'nullable|email|max:255';
        } else {
            $rules['name_chinese'] = 'nullable|string|max:255';
            $rules['contact_no'] = 'nullable|string|max:50';
            $rules['name_english'] = 'nullable|string|max:255';
            $rules['nric'] = 'nullable|string|max:50';
            $rules['email'] = 'nullable|email|max:255';
        }

        $validator = Validator::make($request->all(), $rules);

        if ($validator->fails()) {
            return response()->json([
                'success' => false,
                'message' => 'Validation failed',
                'errors' => $validator->errors()
            ], 422);
        }

        // Additional validation for pledge
        if ($request->input('is_pledge', false)) {
            if (!$request->has('pledge_amount') || $request->pledge_amount <= 0) {
                return response()->json([
                    'success' => false,
                    'message' => 'Pledge amount is required when donation is marked as pledge',
                    'errors' => ['pledge_amount' => ['Pledge amount must be greater than 0']]
                ], 422);
            }

            if ($request->pledge_amount < $request->amount) {
                return response()->json([
                    'success' => false,
                    'message' => 'Pledge amount must be greater than or equal to payment amount',
                    'errors' => ['pledge_amount' => ['Pledge amount must be >= payment amount']]
                ], 422);
            }
        }

        DB::beginTransaction();

        try {
            $booking = Booking::where('booking_type', 'DONATION')->findOrFail($id);
            $user = auth()->user();
            $isPledge = $request->input('is_pledge', false);
            $pledgeAmount = $request->input('pledge_amount', 0);
            $isAnonymous = $request->input('is_anonymous', false);

            // Get donation details
            $donation = DonationMaster::find($request->donation_id);

            if (!$donation) {
                throw new Exception('Donation type not found');
            }

            $paymentMode = PaymentMode::find($request->payment_mode_id);

            Log::info('Updating donation', [
                'booking_id' => $id,
                'booking_number' => $booking->booking_number,
                'updated_by' => $user->id,
                'is_pledge' => $isPledge,
                'is_anonymous' => $isAnonymous
            ]);

            // Determine payment status
            if ($isPledge) {
                $paymentStatus = ($request->amount >= $pledgeAmount) ? 'FULL' : 'PARTIAL';
                $totalAmount = $pledgeAmount;
            } else {
                $paymentStatus = 'FULL';
                $totalAmount = $request->amount;
            }

            // Prepare update data
            $updateData = [
                'subtotal' => $totalAmount,
                'total_amount' => $totalAmount,
                'paid_amount' => $request->amount,
                'payment_status' => $paymentStatus,
                'special_instructions' => $request->notes,
                'payment_method' => $paymentMode ? $paymentMode->name : null,
                'updated_by' => $user->id
            ];

            // Update booking_through if provided
            if ($request->has('booking_through')) {
                $updateData['booking_through'] = $request->booking_through;
            }

            // Update booking
            $booking->update($updateData);

            // Update booking item
            $booking->bookingItems()->update([
                'item_name' => $donation->name,
                'item_name_secondary' => $donation->secondary_name,
                'unit_price' => $totalAmount,
                'total_price' => $totalAmount,
                'notes' => $request->notes
            ]);

            // Update metadata
            $metaUpdates = [
                'donation_type' => $donation->type,
                'donation_name' => $donation->name,
                'donation_id' => $donation->id,
                'is_pledge' => $isPledge ? 'true' : 'false',
                'is_anonymous' => $isAnonymous ? 'true' : 'false',
            ];

            // Update personal info based on anonymous status
            if (!$isAnonymous) {
                $metaUpdates['nric'] = $request->nric ?? '';
                $metaUpdates['name_primary'] = $request->name_english ?? '';
                $metaUpdates['name_secondary'] = $request->name_chinese ?? '';
                $metaUpdates['email'] = $request->email ?? '';
                $metaUpdates['phone_no'] = $request->contact_no ?? '';
            } else {
                $metaUpdates['nric'] = '';
                $metaUpdates['name_primary'] = 'Anonymous Donor';
                $metaUpdates['name_secondary'] = '匿名捐赠者';
                $metaUpdates['email'] = '';
                $metaUpdates['phone_no'] = '';
            }

            if ($isPledge) {
                $metaUpdates['pledge_amount'] = $pledgeAmount;
                $metaUpdates['pledge_balance'] = $pledgeAmount - $request->amount;
                $metaUpdates['pledge_status'] = ($request->amount >= $pledgeAmount) ? 'FULFILLED' : 'PENDING';
            }

            foreach ($metaUpdates as $key => $value) {
                BookingMeta::updateOrCreate(
                    [
                        'booking_id' => $booking->id,
                        'meta_key' => $key
                    ],
                    [
                        'meta_value' => (string)$value,
                        'meta_type' => 'string',
                        'updated_at' => now()
                    ]
                );
            }

            // Prepare payment update data
            $paymentUpdateData = [
                'amount' => $request->amount,
                'payment_mode_id' => $request->payment_mode_id,
                'payment_method' => $paymentMode ? $paymentMode->name : null,
                'payment_type' => ($isPledge && $request->amount < $pledgeAmount) ? 'SPLIT' : 'FULL',

                'notes' => $request->notes,
                'updated_by' => $user->id
            ];

            // Update paid_through if booking_through is provided
            if ($request->has('booking_through')) {
                $paymentUpdateData['paid_through'] = $request->booking_through;
            }

            // Update payment
            $booking->bookingPayments()->update($paymentUpdateData);

            DB::commit();

            // Load relationships for response
            $booking->load(['bookingItems', 'bookingPayments.paymentMode', 'bookingMeta']);

            Log::info('Donation updated successfully', ['booking_id' => $id]);

            return response()->json([
                'success' => true,
                'message' => 'Donation updated successfully',
                'data' => $this->formatDonationResponse($booking)
            ]);
        } catch (Exception $e) {
            DB::rollBack();
            Log::error('Error updating donation: ' . $e->getMessage());

            return response()->json([
                'success' => false,
                'message' => 'Failed to update donation: ' . $e->getMessage()
            ], 500);
        }
    }

    /**
     * Delete a donation
     */
    public function destroy($id)
    {
        DB::beginTransaction();

        try {
            $booking = Booking::where('booking_type', 'DONATION')
                ->findOrFail($id);

            $user = auth()->user();

            Log::info('Deleting donation', [
                'booking_id' => $id,
                'booking_number' => $booking->booking_number,
                'deleted_by' => $user->id
            ]);

            // Soft delete related records
            $booking->bookingItems()->delete();
            $booking->bookingPayments()->delete();
            $booking->bookingMeta()->delete();

            // Soft delete booking
            $booking->delete();

            DB::commit();

            Log::info('Donation deleted successfully', ['booking_id' => $id]);

            return response()->json([
                'success' => true,
                'message' => 'Donation deleted successfully'
            ]);
        } catch (Exception $e) {
            DB::rollBack();
            Log::error('Error deleting donation: ' . $e->getMessage());

            return response()->json([
                'success' => false,
                'message' => 'Failed to delete donation: ' . $e->getMessage()
            ], 500);
        }
    }

    /**
     * Generate booking number
     */
    private function generateBookingNumber($type = 'DONATION')
    {
        $prefix = config('app.env') === 'production' ? 'DNBL' : 'DNBD';
        $date = now()->format('Ymd');

        // Get last booking number for today
        $lastBooking = Booking::where('booking_number', 'like', $prefix . $date . '%')
            ->orderBy('booking_number', 'desc')
            ->first();

        if ($lastBooking) {
            $lastNumber = (int) substr($lastBooking->booking_number, -8);
            $newNumber = str_pad($lastNumber + 1, 8, '0', STR_PAD_LEFT);
        } else {
            $newNumber = '00000001';
        }

        return $prefix . $date . $newNumber;
    }

    /**
     * Generate payment reference
     */
    private function generatePaymentReference()
    {
        $prefix = config('app.env') === 'production' ? 'PYL' : 'PYD';
        $date = now()->format('Ymd');

        // Get last payment reference for today
        $lastPayment = BookingPayment::where('payment_reference', 'like', $prefix . $date . '%')
            ->orderBy('payment_reference', 'desc')
            ->first();

        if ($lastPayment) {
            $lastNumber = (int) substr($lastPayment->payment_reference, -8);
            $newNumber = str_pad($lastNumber + 1, 8, '0', STR_PAD_LEFT);
        } else {
            $newNumber = '00000001';
        }

        return $prefix . $date . $newNumber;
    }

    /**
     * Format donation response
     */
    private function formatDonationResponse($booking)
    {
        $meta = $booking->bookingMeta->pluck('meta_value', 'meta_key');
        $payment = $booking->bookingPayments->first();

        $isPledge = ($meta['is_pledge'] ?? 'false') === 'true';
        $pledgeAmount = $isPledge ? (float)($meta['pledge_amount'] ?? 0) : 0;
        $pledgeBalance = $isPledge ? (float)($meta['pledge_balance'] ?? 0) : 0;
        $pledgeStatus = $isPledge ? ($meta['pledge_status'] ?? 'PENDING') : null;

        $isAnonymous = ($meta['is_anonymous'] ?? 'false') === 'true';

        return [
            'id' => $booking->id,
            'booking_number' => $booking->booking_number,
            'date' => $booking->booking_date->format('Y-m-d'),
            'name_english' => $isAnonymous ? 'Anonymous Donor' : ($meta['name_primary'] ?? ''),
            'name_chinese' => $isAnonymous ? '匿名捐赠者' : ($meta['name_secondary'] ?? ''),
            'nric' => $isAnonymous ? '' : ($meta['nric'] ?? ''),
            'email' => $isAnonymous ? '' : ($meta['email'] ?? ''),
            'contact_no' => $isAnonymous ? '' : ($meta['phone_no'] ?? ''),
            'donation_type' => $meta['donation_type'] ?? '',
            'donation_name' => $meta['donation_name'] ?? '',
            'amount' => $booking->total_amount,
            'paid_amount' => $booking->paid_amount,
            'payment_method' => $payment?->paymentMode?->name ?? '',
            'payment_reference' => $payment?->payment_reference ?? '',
            'payment_status' => $booking->payment_status,
            'booking_status' => $booking->booking_status,
            'notes' => $booking->special_instructions,
            'created_at' => $booking->created_at,
            'created_by' => $booking->createdBy?->name ?? '',
            // Pledge data
            'is_pledge' => $isPledge,
            'pledge_amount' => $pledgeAmount,
            'pledge_balance' => $pledgeBalance,
            'pledge_status' => $pledgeStatus,
            // Anonymous flag
            'is_anonymous' => $isAnonymous,
            // Booking channel data
            'booking_through' => $booking->booking_through ?? 'ADMIN',
            'paid_through' => $payment?->paid_through ?? 'ADMIN',
        ];
    }

    /**
     * Get donation report
     */
    public function getReport(Request $request)
    {
        try {
            $query = Booking::where('booking_type', 'DONATION')
                ->with(['bookingItems', 'bookingPayments.paymentMode', 'bookingMeta', 'createdBy']);

            // Apply filters (same as index method)
            if ($request->has('donation_type')) {
                $query->whereHas('bookingMeta', function ($q) use ($request) {
                    $q->where('meta_key', 'donation_type')
                        ->where('meta_value', $request->donation_type);
                });
            }

            if ($request->has('payment_mode_id')) {
                $query->whereHas('bookingPayments', function ($q) use ($request) {
                    $q->where('payment_mode_id', $request->payment_mode_id);
                });
            }

            if ($request->has('from_date')) {
                $query->whereDate('booking_date', '>=', $request->from_date);
            }

            if ($request->has('to_date')) {
                $query->whereDate('booking_date', '<=', $request->to_date);
            }

            if ($request->has('booking_through')) {
                $query->where('booking_through', $request->booking_through);
            }

            if ($request->has('pledge_status')) {
                $pledgeStatus = $request->pledge_status;
                if ($pledgeStatus === 'pledge_only') {
                    $query->whereHas('bookingMeta', function ($q) {
                        $q->where('meta_key', 'is_pledge')
                            ->where('meta_value', 'true');
                    });
                } elseif ($pledgeStatus === 'non_pledge') {
                    $query->whereHas('bookingMeta', function ($q) {
                        $q->where('meta_key', 'is_pledge')
                            ->where('meta_value', 'false');
                    });
                } elseif ($pledgeStatus === 'PENDING') {
                    $query->whereHas('bookingMeta', function ($q) {
                        $q->where('meta_key', 'pledge_status')
                            ->where('meta_value', 'PENDING');
                    });
                } elseif ($pledgeStatus === 'FULFILLED') {
                    $query->whereHas('bookingMeta', function ($q) {
                        $q->where('meta_key', 'pledge_status')
                            ->where('meta_value', 'FULFILLED');
                    });
                }
            }

            if ($request->has('anonymous_status')) {
                $anonymousStatus = $request->anonymous_status;
                if ($anonymousStatus === 'anonymous_only') {
                    $query->whereHas('bookingMeta', function ($q) {
                        $q->where('meta_key', 'is_anonymous')
                            ->where('meta_value', 'true');
                    });
                } elseif ($anonymousStatus === 'non_anonymous') {
                    $query->whereHas('bookingMeta', function ($q) {
                        $q->where('meta_key', 'is_anonymous')
                            ->where('meta_value', 'false');
                    });
                }
            }

            if ($request->has('search')) {
                $search = $request->search;
                $query->where(function ($q) use ($search) {
                    $q->where('booking_number', 'like', "%$search%")
                        ->orWhereHas('bookingMeta', function ($mq) use ($search) {
                            $mq->where('meta_key', 'name_primary')
                                ->where('meta_value', 'like', "%$search%");
                        })
                        ->orWhereHas('bookingMeta', function ($mq) use ($search) {
                            $mq->where('meta_key', 'name_secondary')
                                ->where('meta_value', 'like', "%$search%");
                        });
                });
            }

            $donations = $query->orderBy('booking_date', 'desc')->get();

            // Format donations
            $formattedDonations = $donations->map(function ($booking) {
                return $this->formatDonationResponse($booking);
            });

            // Calculate summary statistics
            $summary = [
                'total_donations' => $formattedDonations->count(),
                'total_amount' => $formattedDonations->sum('amount'),
                'average_amount' => $formattedDonations->avg('amount') ?: 0,

                // Payment method breakdown
                'cash_amount' => $formattedDonations->where('payment_method', 'Cash')->sum('amount'),
                'card_amount' => $formattedDonations->where('payment_method', 'Card')->sum('amount'),
                'ebanking_amount' => $formattedDonations->filter(function ($d) {
                    return stripos($d['payment_method'], 'banking') !== false ||
                        stripos($d['payment_method'], 'bank') !== false;
                })->sum('amount'),
                'cheque_amount' => $formattedDonations->where('payment_method', 'Cheque')->sum('amount'),
                'duitnow_amount' => $formattedDonations->where('payment_method', 'DuitNow')->sum('amount'),

                // Pledge statistics
                'total_pledges' => $formattedDonations->where('is_pledge', true)->count(),
                'active_pledges' => $formattedDonations->where('is_pledge', true)
                    ->where('pledge_status', 'PENDING')->count(),
                'fulfilled_pledges' => $formattedDonations->where('is_pledge', true)
                    ->where('pledge_status', 'FULFILLED')->count(),
                'total_pledge_amount' => $formattedDonations->where('is_pledge', true)
                    ->sum('pledge_amount'),
                'total_pledge_paid' => $formattedDonations->where('is_pledge', true)
                    ->sum('paid_amount'),
                'total_pledge_balance' => $formattedDonations->where('is_pledge', true)
                    ->sum('pledge_balance'),

                // Anonymous statistics
                'anonymous_donations' => $formattedDonations->where('is_anonymous', true)->count(),
                'anonymous_amount' => $formattedDonations->where('is_anonymous', true)->sum('amount'),

                // Booking channel statistics
                'admin_donations' => $formattedDonations->where('booking_through', 'ADMIN')->count(),
                'app_donations' => $formattedDonations->where('booking_through', 'APP')->count(),
                'kiosk_donations' => $formattedDonations->where('booking_through', 'KIOSK')->count(),
                'counter_donations' => $formattedDonations->where('booking_through', 'COUNTER')->count(),
                'online_donations' => $formattedDonations->where('booking_through', 'ONLINE')->count(),
            ];

            // Prepare report data
            $reportData = [
                'title' => 'Donations Report',
                'period' => [
                    'from' => $request->from_date ?: ($donations->first()->booking_date ?? now()),
                    'to' => $request->to_date ?: ($donations->last()->booking_date ?? now())
                ],
                'filters' => [
                    'type' => $request->donation_type ?: '',
                    'payment_method' => $request->payment_mode_id ?: '',
                    'pledge_status' => $request->pledge_status ?: '',
                    'anonymous_status' => $request->anonymous_status ?: '',
                    'booking_through' => $request->booking_through ?: ''
                ],
                'summary' => $summary,
                'donations' => $formattedDonations,
                'generated_at' => now()->toISOString()
            ];

            return response()->json([
                'success' => true,
                'data' => $reportData
            ]);
        } catch (Exception $e) {
            Log::error('Error generating donations report: ' . $e->getMessage());
            return response()->json([
                'success' => false,
                'message' => 'Failed to generate report'
            ], 500);
        }
    }

    /**
     * Get active ledgers
     */
    public function getActiveLedgers()
    {
        try {
            $ledgers = DB::table('ledgers')
                ->whereNull('deleted_at')
                ->select('id', 'name', 'left_code', 'right_code', 'type')
                ->orderBy('name')
                ->get();

            return response()->json([
                'success' => true,
                'data' => $ledgers
            ]);
        } catch (Exception $e) {
            Log::error('Error fetching ledgers: ' . $e->getMessage());
            return response()->json([
                'success' => false,
                'message' => 'Failed to fetch ledgers'
            ], 500);
        }
    }
}
