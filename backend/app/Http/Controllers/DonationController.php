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
                ->select('id', 'name', 'secondary_name', 'type', 'details')
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
        $validator = Validator::make($request->all(), [
            'donation_id' => 'required|string',
            'name_chinese' => 'required|string|max:255',
            'name_english' => 'nullable|string|max:255',
            'nric' => 'nullable|string|max:50',
            'email' => 'nullable|email|max:255',
            'contact_no' => 'required|string|max:50',
            'amount' => 'required|numeric|min:0.01',
            'payment_mode_id' => 'required|integer|exists:payment_modes,id',
            'notes' => 'nullable|string',
            'print_option' => 'nullable|in:NO_PRINT,SINGLE_PRINT',
            // Pledge fields
            'is_pledge' => 'nullable|boolean',
            'pledge_amount' => 'nullable|numeric|min:0.01',
        ]);

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
                'pledge_amount' => $pledgeAmount
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

            // Create booking
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
                'deposit_amount' => 0,
                'print_option' => $request->print_option ?? 'SINGLE_PRINT',
                'payment_method' => $paymentMode ? $paymentMode->name : null,
                'special_instructions' => $request->notes,
                'created_by' => $user->id
            ]);

            Log::info('Booking created', ['booking_id' => $booking->id]);

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
                'nric' => $request->nric,
                'name_primary' => $request->name_english,
                'name_secondary' => $request->name_chinese,
                'email' => $request->email,
                'phone_no' => $request->contact_no,
                'donation_type' => $donation->type,
                'donation_name' => $donation->name,
                'donation_id' => $donation->id,
                // Pledge metadata
                'is_pledge' => $isPledge ? 'true' : 'false',
            ];

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

            // Create payment record
            $payment = BookingPayment::create([
                'booking_id' => $booking->id,
                'payment_date' => now(),
                'amount' => $request->amount,
                'payment_mode_id' => $request->payment_mode_id,
                'payment_reference' => $paymentReference,
                'payment_type' => $isPledge ? 'DEPOSIT' : 'FULL',
                'payment_method' => $paymentMode ? $paymentMode->name : null,
                'payment_status' => 'SUCCESS',
                'notes' => $isPledge ? 'Initial pledge payment' : $request->notes,
                'created_by' => $user->id
            ]);

            Log::info('Payment record created', ['payment_id' => $payment->id]);

            DB::commit();

            // Load relationships for response
            $booking->load(['bookingItems', 'bookingPayments.paymentMode', 'bookingMeta']);

            Log::info('Donation created successfully', ['booking_id' => $booking->id]);

            return response()->json([
                'success' => true,
                'message' => $isPledge ? 'Pledge donation recorded successfully' : 'Donation recorded successfully',
                'data' => [
                    'booking' => $booking,
                    'booking_number' => $bookingNumber,
                    'payment_reference' => $paymentReference,
                    'is_pledge' => $isPledge,
                    'pledge_amount' => $pledgeAmount
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
     * Get donation list with filters
     */
    public function index(Request $request)
    {
        try {
            $perPage = $request->input('per_page', 25);
            $page = $request->input('page', 1);

            $query = Booking::where('booking_type', 'DONATION')
                ->with(['bookingItems', 'bookingPayments.paymentMode', 'bookingMeta']);

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
            'notes' => 'nullable|string'
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
            
            Log::info('Recording partial payment', [
                'booking_id' => $booking->id,
                'booking_number' => $booking->booking_number,
                'amount' => $request->amount,
                'new_total_paid' => $newPaidAmount,
                'pledge_amount' => $pledgeAmount
            ]);
            
            // Create payment record
            BookingPayment::create([
                'booking_id' => $booking->id,
                'payment_date' => now(),
                'amount' => $request->amount,
                'payment_mode_id' => $request->payment_mode_id,
                'payment_reference' => $paymentReference,
                'payment_type' => 'PARTIAL',
                'payment_method' => $paymentMode ? $paymentMode->name : null,
                'payment_status' => 'SUCCESS',
                'notes' => $request->notes ?? 'Partial pledge payment',
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
            
            DB::commit();
            
            Log::info('Partial payment recorded successfully', [
                'booking_id' => $booking->id,
                'payment_reference' => $paymentReference
            ]);
            
            return response()->json([
                'success' => true,
                'message' => 'Partial payment recorded successfully',
                'data' => [
                    'payment_reference' => $paymentReference,
                    'total_paid' => $newPaidAmount,
                    'remaining_balance' => $newBalance,
                    'pledge_status' => $pledgeStatus,
                    'is_fulfilled' => $pledgeStatus === 'FULFILLED'
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
        $validator = Validator::make($request->all(), [
            'donation_id' => 'required|string',
            'name_chinese' => 'required|string|max:255',
            'name_english' => 'nullable|string|max:255',
            'nric' => 'nullable|string|max:50',
            'email' => 'nullable|email|max:255',
            'contact_no' => 'required|string|max:50',
            'amount' => 'required|numeric|min:0.01',
            'payment_mode_id' => 'required|integer|exists:payment_modes,id',
            'notes' => 'nullable|string',
            // Pledge fields
            'is_pledge' => 'nullable|boolean',
            'pledge_amount' => 'nullable|numeric|min:0.01',
        ]);

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
                'is_pledge' => $isPledge
            ]);

            // Determine payment status
            if ($isPledge) {
                $paymentStatus = ($request->amount >= $pledgeAmount) ? 'FULL' : 'PARTIAL';
                $totalAmount = $pledgeAmount;
            } else {
                $paymentStatus = 'FULL';
                $totalAmount = $request->amount;
            }

            // Update booking
            $booking->update([
                'subtotal' => $totalAmount,
                'total_amount' => $totalAmount,
                'paid_amount' => $request->amount,
                'payment_status' => $paymentStatus,
                'special_instructions' => $request->notes,
                'payment_method' => $paymentMode ? $paymentMode->name : null,
                'updated_by' => $user->id
            ]);

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
                'nric' => $request->nric,
                'name_primary' => $request->name_english,
                'name_secondary' => $request->name_chinese,
                'email' => $request->email,
                'phone_no' => $request->contact_no,
                'donation_type' => $donation->type,
                'donation_name' => $donation->name,
                'donation_id' => $donation->id,
                'is_pledge' => $isPledge ? 'true' : 'false',
            ];

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

            // Update payment
            $booking->bookingPayments()->update([
                'amount' => $request->amount,
                'payment_mode_id' => $request->payment_mode_id,
                'payment_method' => $paymentMode ? $paymentMode->name : null,
                'payment_type' => $isPledge ? 'DEPOSIT' : 'FULL',
                'notes' => $request->notes,
                'updated_by' => $user->id
            ]);

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

        return [
            'id' => $booking->id,
            'booking_number' => $booking->booking_number,
            'date' => $booking->booking_date->format('Y-m-d'),
            'name_english' => $meta['name_primary'] ?? '',
            'name_chinese' => $meta['name_secondary'] ?? '',
            'nric' => $meta['nric'] ?? '',
            'email' => $meta['email'] ?? '',
            'contact_no' => $meta['phone_no'] ?? '',
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
        ];
    }
    public function getReport(Request $request)
{
    try {
        $query = Booking::where('booking_type', 'DONATION')
            ->with(['bookingItems', 'bookingPayments.paymentMode', 'bookingMeta']);

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
            'ebanking_amount' => $formattedDonations->filter(function($d) {
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
                'pledge_status' => $request->pledge_status ?: ''
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



}