<?php

namespace App\Http\Controllers;

use App\Http\Controllers\Controller;
use App\Models\Booking;
use App\Models\BookingMeta;
use App\Models\BookingPayment;
use App\Models\PaymentMode;
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
     * Store a new Buddha Lamp booking
     *
     * @param Request $request
     * @return \Illuminate\Http\JsonResponse
     */
    public function store(Request $request)
    {
        // Validate request
        $validator = Validator::make($request->all(), [
            'booking_type' => 'required|string',
            'booking_date' => 'required|date',
            'total_amount' => 'required|numeric|min:0',
            'paid_amount' => 'required|numeric|min:0',
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
            'payment.amount' => 'required|numeric|min:0',
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
            
            // Generate booking number
            $bookingNumber = $this->generateBookingNumber($isLive);
            
            // Get payment mode name for reference
            $paymentMode = PaymentMode::find($request->input('payment.payment_mode_id'));
            
            // Determine booking and payment status
            $paidAmount = $request->input('paid_amount');
            $totalAmount = $request->input('total_amount');
            $paymentStatus = $this->determinePaymentStatus($paidAmount, $totalAmount);
            
            // Create booking record
            $booking = Booking::create([
                'booking_number' => $bookingNumber,
                'booking_type' => self::BOOKING_TYPE,
                'devotee_id' => null, // Can be linked later if devotee registration exists
                'booking_date' => Carbon::parse($request->input('booking_date')),
                'booking_status' => 'CONFIRMED', // Direct confirmation for Buddha Lamp
                'payment_status' => $paymentStatus,
                'subtotal' => $totalAmount,
                'tax_amount' => 0,
                'discount_amount' => 0,
                'deposit_amount' => 0,
                'total_amount' => $totalAmount,
                'paid_amount' => $paidAmount,
                'payment_method' => $paymentMode ? $paymentMode->name : null,
                'print_option' => $request->input('print_option'),
                'special_instructions' => $request->input('special_instructions'),
                'created_by' => $user->id,
            ]);

            // Create booking meta records
            $metaData = $request->input('meta');
            $metaRecords = [
                ['meta_key' => 'booking_type', 'meta_value' => self::BOOKING_TYPE, 'meta_type' => 'STRING'],
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

            // Generate payment reference
            $paymentReference = $this->generatePaymentReference($isLive);
            
            // Create payment record
            $paymentData = $request->input('payment');
            BookingPayment::create([
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

            DB::commit();

            // Load relationships for response
            $booking->load(['meta', 'payments']);

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
     * Get a single Buddha Lamp booking
     *
     * @param string $id
     * @return \Illuminate\Http\JsonResponse
     */
    public function show($id)
    {
        try {
            $booking = Booking::with(['meta', 'payments', 'creator'])
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
     * List all Buddha Lamp bookings with pagination
     *
     * @param Request $request
     * @return \Illuminate\Http\JsonResponse
     */
    public function index(Request $request)
    {
        try {
            $query = Booking::with(['meta', 'payments', 'creator'])
                ->where('booking_type', self::BOOKING_TYPE);

            // Apply filters
            if ($request->has('booking_status')) {
                $query->where('booking_status', $request->booking_status);
            }

            if ($request->has('payment_status')) {
                $query->where('payment_status', $request->payment_status);
            }

            if ($request->has('from_date')) {
                $query->whereDate('booking_date', '>=', $request->from_date);
            }

            if ($request->has('to_date')) {
                $query->whereDate('booking_date', '<=', $request->to_date);
            }

            if ($request->has('search')) {
                $search = $request->search;
                $query->where(function($q) use ($search) {
                    $q->where('booking_number', 'ILIKE', "%{$search}%")
                      ->orWhereHas('meta', function($metaQuery) use ($search) {
                          $metaQuery->where('meta_key', 'name_primary')
                                   ->where('meta_value', 'ILIKE', "%{$search}%");
                      })
                      ->orWhereHas('meta', function($metaQuery) use ($search) {
                          $metaQuery->where('meta_key', 'name_secondary')
                                   ->where('meta_value', 'ILIKE', "%{$search}%");
                      })
                      ->orWhereHas('meta', function($metaQuery) use ($search) {
                          $metaQuery->where('meta_key', 'nric')
                                   ->where('meta_value', 'ILIKE', "%{$search}%");
                      })
                      ->orWhereHas('meta', function($metaQuery) use ($search) {
                          $metaQuery->where('meta_key', 'phone_no')
                                   ->where('meta_value', 'ILIKE', "%{$search}%");
                      });
                });
            }

            // Sort
            $sortBy = $request->get('sort_by', 'created_at');
            $sortOrder = $request->get('sort_order', 'desc');
            $query->orderBy($sortBy, $sortOrder);

            // Pagination
            $perPage = $request->get('per_page', 15);
            $bookings = $query->paginate($perPage);

            // Format response
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
     * @param string $id
     * @param Request $request
     * @return \Illuminate\Http\JsonResponse
     */
    public function update($id, Request $request)
    {
        // Validate request
        $validator = Validator::make($request->all(), [
            'booking_date' => 'required|date',
            'booking_status' => 'required|in:PENDING,CONFIRMED,COMPLETED',
            'total_amount' => 'required|numeric|min:0',
            'paid_amount' => 'required|numeric|min:0',
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
            'payment.amount' => 'required|numeric|min:0',
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
            
            // Find booking
            $booking = Booking::where('id', $id)
                ->where('booking_type', self::BOOKING_TYPE)
                ->first();

            if (!$booking) {
                return response()->json([
                    'success' => false,
                    'message' => 'Booking not found'
                ], 404);
            }

            // Check if booking can be edited
            if ($booking->booking_status === 'CANCELLED') {
                return response()->json([
                    'success' => false,
                    'message' => 'Cancelled bookings cannot be edited'
                ], 400);
            }

            // Get payment mode name for reference
            $paymentMode = PaymentMode::find($request->input('payment.payment_mode_id'));
            
            // Determine payment status
            $paidAmount = $request->input('paid_amount');
            $totalAmount = $request->input('total_amount');
            $paymentStatus = $this->determinePaymentStatus($paidAmount, $totalAmount);
            
            // Update booking record
            $booking->update([
                'booking_date' => Carbon::parse($request->input('booking_date')),
                'booking_status' => $request->input('booking_status'),
                'payment_status' => $paymentStatus,
                'subtotal' => $totalAmount,
                'total_amount' => $totalAmount,
                'paid_amount' => $paidAmount,
                'payment_method' => $paymentMode ? $paymentMode->name : null,
                'print_option' => $request->input('print_option'),
                'special_instructions' => $request->input('special_instructions'),
                'updated_at' => now(),
            ]);

            // Update booking meta records
            $metaData = $request->input('meta');
            $metaUpdates = [
                'nric' => $metaData['nric'],
                'name_primary' => $metaData['name_primary'],
                'name_secondary' => $metaData['name_secondary'] ?? '',
                'email' => $metaData['email'],
                'phone_no' => $metaData['phone_no'],
                'additional_notes' => $metaData['additional_notes'] ?? '',
            ];

            foreach ($metaUpdates as $key => $value) {
                BookingMeta::updateOrCreate(
                    [
                        'booking_id' => $booking->id,
                        'meta_key' => $key
                    ],
                    [
                        'meta_value' => $value,
                        'meta_type' => 'STRING',
                        'updated_at' => now(),
                    ]
                );
            }

            // Update or create payment record
            $paymentData = $request->input('payment');
            $existingPayment = BookingPayment::where('booking_id', $booking->id)
                ->where('payment_status', 'SUCCESS')
                ->first();

            if ($existingPayment) {
                // Update existing payment
                $existingPayment->update([
                    'amount' => $paymentData['amount'],
                    'payment_mode_id' => $paymentData['payment_mode_id'],
                    'payment_method' => $paymentMode ? $paymentMode->name : null,
                    'payment_type' => $paymentData['payment_type'],
                    'payment_status' => $paymentData['payment_status'],
                    'updated_by' => $user->id,
                    'updated_at' => now(),
                ]);
            } else {
                // Create new payment if none exists
                $isLive = config('app.env') === 'production';
                $paymentReference = $this->generatePaymentReference($isLive);
                
                BookingPayment::create([
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
            }

            DB::commit();

            // Load relationships for response
            $booking->load(['meta', 'payments', 'creator']);

            // Format response data
            $responseData = $this->formatBookingResponse($booking);

            return response()->json([
                'success' => true,
                'message' => 'Buddha Lamp booking updated successfully',
                'data' => $responseData
            ]);

        } catch (\Exception $e) {
            DB::rollBack();
            
            Log::error('Buddha Lamp booking update failed', [
                'id' => $id,
                'error' => $e->getMessage(),
                'trace' => $e->getTraceAsString(),
                'request' => $request->all()
            ]);

            return response()->json([
                'success' => false,
                'message' => 'Failed to update booking: ' . $e->getMessage(),
                'error' => config('app.debug') ? $e->getMessage() : 'An error occurred'
            ], 500);
        }
    }

    /**
     * Cancel a Buddha Lamp booking
     *
     * @param string $id
     * @param Request $request
     * @return \Illuminate\Http\JsonResponse
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

            return response()->json([
                'success' => true,
                'message' => 'Booking cancelled successfully',
                'data' => $this->formatBookingResponse($booking->fresh(['meta', 'payments']))
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
     * Delete a Buddha Lamp booking (soft delete)
     *
     * @param string $id
     * @param Request $request
     * @return \Illuminate\Http\JsonResponse
     */
    public function destroy($id, Request $request)
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

            // Only allow deletion of cancelled or pending bookings
            if (!in_array($booking->booking_status, ['CANCELLED', 'PENDING'])) {
                return response()->json([
                    'success' => false,
                    'message' => 'Only cancelled or pending bookings can be deleted'
                ], 400);
            }

            // Soft delete or hard delete based on configuration
            $booking->delete();

            return response()->json([
                'success' => true,
                'message' => 'Booking deleted successfully'
            ]);

        } catch (\Exception $e) {
            Log::error('Failed to delete Buddha Lamp booking', [
                'id' => $id,
                'error' => $e->getMessage()
            ]);

            return response()->json([
                'success' => false,
                'message' => 'Failed to delete booking'
            ], 500);
        }
    }

    /**
     * Get booking statistics
     *
     * @param Request $request
     * @return \Illuminate\Http\JsonResponse
     */
    public function statistics(Request $request)
    {
        try {
            $query = Booking::where('booking_type', self::BOOKING_TYPE);

            // Apply date filters if provided
            if ($request->has('from_date')) {
                $query->whereDate('booking_date', '>=', $request->from_date);
            }

            if ($request->has('to_date')) {
                $query->whereDate('booking_date', '<=', $request->to_date);
            }

            // Get statistics
            $totalBookings = (clone $query)->count();
            $totalAmount = (clone $query)->sum('total_amount');
            $paidAmount = (clone $query)->sum('paid_amount');
            
            $confirmedBookings = (clone $query)->where('booking_status', 'CONFIRMED')->count();
            $completedBookings = (clone $query)->where('booking_status', 'COMPLETED')->count();
            $cancelledBookings = (clone $query)->where('booking_status', 'CANCELLED')->count();
            $pendingBookings = (clone $query)->where('booking_status', 'PENDING')->count();
            
            $fullyPaid = (clone $query)->where('payment_status', 'FULL')->count();
            $partiallyPaid = (clone $query)->where('payment_status', 'PARTIAL')->count();
            $unpaid = (clone $query)->where('payment_status', 'PENDING')->count();

            // This month statistics
            $thisMonthQuery = Booking::where('booking_type', self::BOOKING_TYPE)
                ->whereMonth('booking_date', Carbon::now()->month)
                ->whereYear('booking_date', Carbon::now()->year);
            
            $thisMonthBookings = $thisMonthQuery->count();
            $thisMonthAmount = $thisMonthQuery->sum('total_amount');

            return response()->json([
                'success' => true,
                'data' => [
                    'total_bookings' => $totalBookings,
                    'total_amount' => (float) $totalAmount,
                    'paid_amount' => (float) $paidAmount,
                    'outstanding_amount' => (float) ($totalAmount - $paidAmount),
                    
                    'by_status' => [
                        'confirmed' => $confirmedBookings,
                        'completed' => $completedBookings,
                        'cancelled' => $cancelledBookings,
                        'pending' => $pendingBookings,
                    ],
                    
                    'by_payment' => [
                        'fully_paid' => $fullyPaid,
                        'partially_paid' => $partiallyPaid,
                        'unpaid' => $unpaid,
                    ],
                    
                    'this_month' => [
                        'bookings' => $thisMonthBookings,
                        'amount' => (float) $thisMonthAmount,
                    ]
                ]
            ]);

        } catch (\Exception $e) {
            Log::error('Failed to fetch Buddha Lamp statistics', [
                'error' => $e->getMessage()
            ]);

            return response()->json([
                'success' => false,
                'message' => 'Failed to fetch statistics'
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

        return [
            'id' => $booking->id,
            'booking_number' => $booking->booking_number,
            'booking_type' => $booking->booking_type ?? self::BOOKING_TYPE,
            'booking_date' => $booking->booking_date ? $booking->booking_date->format('Y-m-d') : null,
            'booking_status' => $booking->booking_status,
            'payment_status' => $booking->payment_status,
            'total_amount' => (float) $booking->total_amount,
            'paid_amount' => (float) $booking->paid_amount,
            'print_option' => $booking->print_option,
            'special_instructions' => $booking->special_instructions,
            
            // Meta data
            'nric' => $metaData['nric'] ?? null,
            'name_primary' => $metaData['name_primary'] ?? null,
            'name_secondary' => $metaData['name_secondary'] ?? null,
            'email' => $metaData['email'] ?? null,
            'phone_no' => $metaData['phone_no'] ?? null,
            'additional_notes' => $metaData['additional_notes'] ?? null,
            
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
}