<?php

namespace App\Http\Controllers;

use App\Models\Booking;
use App\Models\BookingMeta;
use App\Models\BookingItem;
use App\Models\BookingItemMeta;
use App\Models\BookingPayment;
use App\Models\SpecialOccasion;
use App\Models\OccasionOption;
use App\Models\PaymentMode;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Log;
use Illuminate\Support\Facades\Validator;
use Carbon\Carbon;
use Exception;

class SpecialOccasionBookingController extends Controller
{
    /**
     * Display a listing of special occasion bookings
     */
    public function index(Request $request)
    {
        try {
            $query = Booking::with(['meta', 'items.meta', 'payments.paymentMode'])
                ->where('booking_type', 'SPECIAL_OCCASIONS');

            // Filter by status
            if ($request->filled('booking_status')) {
                $query->where('booking_status', $request->booking_status);
            }

            if ($request->filled('payment_status')) {
                $query->where('payment_status', $request->payment_status);
            }

            // Filter by date range
            if ($request->filled('start_date')) {
                $query->whereDate('booking_date', '>=', $request->start_date);
            }

            if ($request->filled('end_date')) {
                $query->whereDate('booking_date', '<=', $request->end_date);
            }

            // Search by booking number or devotee info
            if ($request->filled('search')) {
                $search = $request->search;
                $query->where(function ($q) use ($search) {
                    $q->where('booking_number', 'ILIKE', "%{$search}%")
                        ->orWhereHas('meta', function ($mq) use ($search) {
                            $mq->where('meta_value', 'ILIKE', "%{$search}%");
                        });
                });
            }

            // Pagination
            $perPage = $request->get('per_page', 15);
            $bookings = $query->orderBy('created_at', 'desc')->paginate($perPage);

            // Transform data for frontend
            $bookings->getCollection()->transform(function ($booking) {
                return $this->transformBookingForResponse($booking);
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
                    'to' => $bookings->lastItem()
                ]
            ], 200);
        } catch (Exception $e) {
            Log::error('Error fetching special occasion bookings', [
                'error' => $e->getMessage(),
                'trace' => $e->getTraceAsString()
            ]);

            return response()->json([
                'success' => false,
                'message' => 'Failed to fetch bookings',
                'error' => $e->getMessage()
            ], 500);
        }
    }

    /**
     * Store a new special occasion booking WITH ADDON SERVICE SUPPORT
     * Frontend sends: special_occasion_id, option_id, slot_id, event_date,
     *                 name_chinese, name_english, nric, email, contact_no,
     *                 payment_methods (payment_mode_id), remark,
     *                 discount_amount (optional), deposit_amount (optional),
     *                 addon_service_id (optional)
     */
    public function store(Request $request)
    {
        try {
            // Validation
            $validator = Validator::make($request->all(), [
                'special_occasion_id' => 'required|integer|exists:special_occ_master,id',
                'option_id' => 'required|integer|exists:occasion_options,id',
                'slot_id' => 'nullable|integer',
                'event_date' => 'required|date',
                'name_chinese' => 'required|string|max:255',
                'name_english' => 'required|string|max:255',
                'nric' => 'required|string|max:50',
                'email' => 'required|email|max:255',
                'contact_no' => 'required|string|max:50',
                'payment_methods' => 'required|integer|exists:payment_modes,id',
                'remark' => 'nullable|string',
                'booking_through' => 'nullable|in:ADMIN,COUNTER,APP,KIOSK,ONLINE',
                'discount_amount' => 'nullable|numeric|min:0',
                'deposit_amount' => 'nullable|numeric|min:0',
                'addon_service_id' => 'nullable|integer|exists:occasion_services_master,id',
            ]);

            if ($validator->fails()) {
                return response()->json([
                    'success' => false,
                    'message' => 'Validation error',
                    'errors' => $validator->errors()
                ], 422);
            }

            DB::beginTransaction();

            // ==========================================
            // STEP 1: GET OCCASION AND OPTION DETAILS
            // ==========================================
            $occasion = DB::table('special_occ_master')->find($request->special_occasion_id);
            $option = DB::table('occasion_options')->find($request->option_id);
            if (!$option) {
                return response()->json([
                    'success' => false,
                    'message' => 'Invalid package selected'
                ], 422);
            }
            $paymentMode = PaymentMode::findOrFail($request->payment_methods);

            // Get slot details if provided
            $slotData = null;
            if ($request->filled('slot_id')) {
                $slotData = DB::table('occasion_option_time_slots')
                    ->where('id', $request->slot_id)
                    ->first();
            }

            // ==========================================
            // STEP 2: GET ADDON SERVICE IF PROVIDED
            // ==========================================
            $addonService = null;
            $addonAmount = 0;

            if ($request->filled('addon_service_id')) {
                $addonService = DB::table('occasion_services_master')
                    ->where('id', $request->addon_service_id)
                    ->where('is_addon', true)
                    ->where('status', 'active')
                    ->first();

                if (!$addonService) {
                    return response()->json([
                        'success' => false,
                        'message' => 'Invalid addon service selected'
                    ], 422);
                }

                $addonAmount = (float)$addonService->amount;
            }

            // ==========================================
            // STEP 3: CALCULATE AMOUNTS
            // ==========================================
            $packageAmount = (float)$option->amount;
            $subtotal = $packageAmount + $addonAmount;

            // Handle discount
            $discountAmount = $request->filled('discount_amount') ? (float)$request->discount_amount : 0;
            if ($discountAmount > $subtotal) {
                return response()->json([
                    'success' => false,
                    'message' => 'Discount amount cannot exceed subtotal'
                ], 422);
            }

            // Handle deposit
            $depositAmount = $request->filled('deposit_amount') ? (float)$request->deposit_amount : 0;
            $totalAmount = $subtotal - $discountAmount;

            if ($depositAmount > $totalAmount) {
                return response()->json([
                    'success' => false,
                    'message' => 'Deposit amount cannot exceed total amount'
                ], 422);
            }

            // Determine payment status
            $paidAmount = $depositAmount > 0 ? $depositAmount : $totalAmount;
            $paymentStatus = 'FULL';
            if ($depositAmount > 0 && $depositAmount < $totalAmount) {
                $paymentStatus = 'SPLIT';
            }

            Log::info('Calculated booking amounts', [
                'package_amount' => $packageAmount,
                'addon_amount' => $addonAmount,
                'subtotal' => $subtotal,
                'discount_amount' => $discountAmount,
                'total_amount' => $totalAmount,
                'deposit_amount' => $depositAmount,
                'paid_amount' => $paidAmount,
                'payment_status' => $paymentStatus
            ]);

            // ==========================================
            // STEP 4: GENERATE BOOKING NUMBER
            // ==========================================
            $bookingNumber = $this->generateBookingNumber();
            $paymentReference = $this->generatePaymentReference();

            // ==========================================
            // STEP 5: CREATE BOOKING RECORD
            // ==========================================
            $booking = Booking::create([
                'booking_number' => $bookingNumber,
                'booking_type' => 'SPECIAL_OCCASIONS',
                'booking_through' => $request->booking_through ?? 'ADMIN',
                'booking_date' => $request->event_date,
                'booking_status' => 'CONFIRMED',
                'payment_status' => $paymentStatus,
                'print_option' => 'SINGLE_PRINT',
                'total_amount' => $totalAmount,
                'paid_amount' => $paidAmount,
                'payment_method' => $paymentMode ? $paymentMode->name : null,
                'subtotal' => $subtotal,
                'tax_amount' => 0,
                'discount_amount' => $discountAmount,
                'devotee_id' => null, // NULL for walk-in devotees
                'created_by' => auth()->id() ?? null,
                'special_instructions' => $request->remark,
                'account_migration' => 0,
                'user_id' => auth()->id(),
            ]);

            Log::info('Booking created', [
                'booking_id' => $booking->id,
                'booking_number' => $bookingNumber,
                'total_amount' => $totalAmount,
                'discount_amount' => $discountAmount,
                'deposit_amount' => $depositAmount
            ]);

            // ==========================================
            // STEP 6: SAVE DEVOTEE INFO IN BOOKING_META
            // ==========================================
            $metaData = [
                'nric' => $request->nric,
                'name_chinese' => $request->name_chinese,
                'name_english' => $request->name_english,
                'email' => $request->email,
                'contact_no' => $request->contact_no
            ];

            if ($request->filled('remark')) {
                $metaData['remark'] = $request->remark;
            }

            // Store discount and deposit info in meta
            if ($discountAmount > 0) {
                $metaData['discount_amount'] = (string)$discountAmount;
            }

            if ($depositAmount > 0) {
                $metaData['deposit_amount'] = (string)$depositAmount;
                $metaData['balance_due'] = (string)($totalAmount - $depositAmount);
            }

            foreach ($metaData as $key => $value) {
                BookingMeta::create([
                    'booking_id' => $booking->id,
                    'meta_key' => $key,
                    'meta_value' => $value,
                    'meta_type' => 'string',
                    'created_at' => now(),
                    'updated_at' => now()
                ]);
            }

            Log::info('Booking meta created', [
                'booking_id' => $booking->id,
                'meta_count' => count($metaData)
            ]);

            // ==========================================
            // STEP 7: CREATE MAIN BOOKING ITEM (Package)
            // ==========================================
            $bookingItem = BookingItem::create([
                'booking_id' => $booking->id,
                'item_type' => 'SPECIAL_OCCASION',
                'item_id' => $request->special_occasion_id,
                'item_name' => $occasion->occasion_name_primary,
                'item_name_secondary' => $occasion->occasion_name_secondary,
                'quantity' => 1,
                'unit_price' => $packageAmount,
                'total_price' => $packageAmount,
                'status' => 'SUCCESS',
                'add_ons' => 0,  // MAIN PACKAGE - NOT AN ADDON
                'created_at' => now(),
                'updated_at' => now()
            ]);

            Log::info('Main booking item created', [
                'booking_item_id' => $bookingItem->id,
                'item_name' => $occasion->occasion_name_primary,
                'add_ons' => 0
            ]);

            // ==========================================
            // STEP 8: SAVE PACKAGE & SLOT IN BOOKING_ITEM_META
            // ==========================================
            $itemMetaData = [
                'occasion_id' => (string)$request->special_occasion_id,  // Added for relocation feature
                'option_id' => (string)$request->option_id,
                'option_name' => $option->name,
                'event_date' => $request->event_date
            ];

            if ($option->name_secondary) {
                $itemMetaData['option_name_secondary'] = $option->name_secondary;
            }

            if ($slotData) {
                $itemMetaData['slot_id'] = (string)$request->slot_id;
                $itemMetaData['slot_name'] = $slotData->slot_name;

                if ($slotData->slot_name_secondary) {
                    $itemMetaData['slot_name_secondary'] = $slotData->slot_name_secondary;
                }

                $itemMetaData['slot_time'] = $slotData->start_time . ' - ' . $slotData->end_time;
                $itemMetaData['start_time'] = $slotData->start_time;
                $itemMetaData['end_time'] = $slotData->end_time;
            }

            foreach ($itemMetaData as $key => $value) {
                BookingItemMeta::create([
                    'booking_item_id' => $bookingItem->id,
                    'meta_key' => $key,
                    'meta_value' => $value,
                    'meta_type' => 'string',
                    'created_at' => now()
                ]);
            }

            Log::info('Booking item meta created', [
                'booking_item_id' => $bookingItem->id,
                'meta_count' => count($itemMetaData)
            ]);

            // ==========================================
            // STEP 9: CREATE ADDON SERVICE BOOKING ITEM (IF SELECTED)
            // ==========================================
            $addonServiceResponse = null;
            if ($addonService) {
                $addonItem = BookingItem::create([
                    'booking_id' => $booking->id,
                    'item_type' => 'SPECIAL_OCCASION_ADDON',
                    'item_id' => $addonService->id,
                    'item_name' => $addonService->name,
                    'item_name_secondary' => $addonService->name_secondary,
                    'quantity' => 1,
                    'unit_price' => $addonAmount,
                    'total_price' => $addonAmount,
                    'status' => 'SUCCESS',
                    'add_ons' => 1,  // THIS IS AN ADDON SERVICE
                    'created_at' => now(),
                    'updated_at' => now()
                ]);

                // Save addon service metadata
                BookingItemMeta::create([
                    'booking_item_id' => $addonItem->id,
                    'meta_key' => 'addon_service_id',
                    'meta_value' => (string)$addonService->id,
                    'meta_type' => 'string',
                    'created_at' => now()
                ]);

                if ($addonService->ledger_id) {
                    BookingItemMeta::create([
                        'booking_item_id' => $addonItem->id,
                        'meta_key' => 'ledger_id',
                        'meta_value' => (string)$addonService->ledger_id,
                        'meta_type' => 'integer',
                        'created_at' => now()
                    ]);
                }

                $addonServiceResponse = [
                    'service_id' => $addonService->id,
                    'name' => $addonService->name,
                    'name_secondary' => $addonService->name_secondary,
                    'amount' => (float)$addonAmount,
                    'quantity' => 1,
                    'total' => (float)$addonAmount
                ];

                Log::info('Addon service booking item created', [
                    'booking_item_id' => $addonItem->id,
                    'service_name' => $addonService->name,
                    'add_ons' => 1,
                    'amount' => $addonAmount
                ]);
            }

            // ==========================================
            // STEP 10: RECORD PAYMENT
            // ==========================================
            $payment = BookingPayment::create([
                'booking_id' => $booking->id,
                'payment_date' => now(),
                'amount' => $paidAmount,
                'payment_mode_id' => $request->payment_methods,
                'payment_reference' => $paymentReference,
                'payment_method' => $paymentMode ? $paymentMode->name : null,
                'payment_type' => $paymentStatus === 'SPLIT' ? 'SPLIT' : 'FULL',
                'payment_status' => 'SUCCESS',
                'paid_through' => $request->booking_through ?? 'ADMIN',
                'created_by' => auth()->id() ?? null,
                'created_at' => now(),
                'updated_at' => now()
            ]);

            Log::info('Booking payment created', [
                'payment_id' => $payment->id,
                'amount' => $paidAmount,
                'payment_type' => $paymentStatus === 'SPLIT' ? 'SPLIT' : 'FULL'
            ]);

            // ==========================================
            // STEP 11: ACCOUNT MIGRATION (Double-Entry Bookkeeping)
            // ==========================================
            try {
                $this->accountMigration($booking->id, $option, $addonService);

                Log::info('Account migration processed for special occasion booking', [
                    'booking_number' => $booking->booking_number
                ]);
            } catch (\Exception $accountException) {
                DB::rollBack();

                Log::error('Account migration failed for special occasion booking', [
                    'booking_number' => $booking->booking_number,
                    'error' => $accountException->getMessage()
                ]);

                return response()->json([
                    'success' => false,
                    'message' => 'Account migration failed: ' . $accountException->getMessage(),
                    'error_type' => 'ACCOUNT_ERROR'
                ], 400);
            }

            DB::commit();

            // ==========================================
            // STEP 12: RETURN SUCCESS RESPONSE
            // ==========================================
            // Prepare slot name for response
            $slotName = null;
            $slotTime = null;
            if ($slotData) {
                $slotName = $slotData->slot_name;
                if ($slotData->slot_name_secondary) {
                    $slotName .= ' (' . $slotData->slot_name_secondary . ')';
                }
                $slotTime = $slotData->start_time . ' - ' . $slotData->end_time;
            }

            // Prepare addon services array for response
            $addonServicesArray = $addonServiceResponse ? [$addonServiceResponse] : [];

            return response()->json([
                'success' => true,
                'message' => 'Booking created successfully',
                'data' => [
                    'id' => $booking->id,
                    'booking_code' => $booking->booking_number,
                    'booking_number' => $booking->booking_number,
                    'occasion_name' => $occasion->occasion_name_primary,
                    'occasion_option' => $option->name,
                    'occasion_amount' => (float)$packageAmount,
                    'addon_services' => $addonServicesArray,
                    'addon_total' => $addonAmount,
                    'subtotal' => $subtotal,
                    'discount_amount' => $discountAmount,
                    'total_amount' => $totalAmount,
                    'deposit_amount' => $depositAmount,
                    'balance_due' => $totalAmount - $depositAmount,
                    'paid_amount' => $paidAmount,
                    'event_date' => $request->event_date,
                    'slot_id' => $request->slot_id,
                    'slot_name' => $slotName,
                    'slot_time' => $slotTime,
                    'name_chinese' => $request->name_chinese,
                    'name_english' => $request->name_english,
                    'nric' => $request->nric,
                    'email' => $request->email,
                    'contact_no' => $request->contact_no,
                    'payment_method' => $paymentMode ? $paymentMode->name : null,
                    'booking_status' => $booking->booking_status,
                    'payment_status' => $booking->payment_status,
                    'print_option' => $booking->print_option,
                    'created_at' => $booking->created_at->toDateTimeString()
                ]
            ], 201);
        } catch (Exception $e) {
            DB::rollBack();
            Log::error('Error creating special occasion booking', [
                'error' => $e->getMessage(),
                'trace' => $e->getTraceAsString(),
                'request_data' => $request->all()
            ]);

            return response()->json([
                'success' => false,
                'message' => 'Failed to create booking',
                'error' => $e->getMessage()
            ], 500);
        }
    }

    /**
     * Display the specified booking
     */
    public function show($id)
    {
        try {
            $booking = Booking::with(['meta', 'items.meta', 'payments.paymentMode'])
                ->where('booking_type', 'SPECIAL_OCCASIONS')
                ->findOrFail($id);

            $transformedBooking = $this->transformBookingForResponse($booking);

            return response()->json([
                'success' => true,
                'data' => $transformedBooking
            ], 200);
        } catch (Exception $e) {
            Log::error('Error fetching booking', [
                'booking_id' => $id,
                'error' => $e->getMessage()
            ]);

            return response()->json([
                'success' => false,
                'message' => 'Booking not found'
            ], 404);
        }
    }

    /**
     * Update booking status
     */
    public function updateStatus(Request $request, $id)
    {
        try {
            $validator = Validator::make($request->all(), [
                'booking_status' => 'required|in:PENDING,WAITING,BOOKED,COMPLETED,FAILED,CANCELLED',
                'cancellation_reason' => 'required_if:booking_status,CANCELLED|nullable|string'
            ]);

            if ($validator->fails()) {
                return response()->json([
                    'success' => false,
                    'message' => 'Validation error',
                    'errors' => $validator->errors()
                ], 422);
            }

            $booking = Booking::where('booking_type', 'SPECIAL_OCCASIONS')
                ->findOrFail($id);

            DB::beginTransaction();

            $updateData = [
                'booking_status' => $request->booking_status,
                'updated_at' => now()
            ];

            // Handle cancellation
            if ($request->booking_status === 'CANCELLED') {
                // Save cancellation reason in booking_meta
                BookingMeta::create([
                    'booking_id' => $booking->id,
                    'meta_key' => 'cancellation_reason',
                    'meta_value' => $request->cancellation_reason,
                    'meta_type' => 'string',
                    'created_at' => now(),
                    'updated_at' => now()
                ]);

                BookingMeta::create([
                    'booking_id' => $booking->id,
                    'meta_key' => 'cancelled_at',
                    'meta_value' => now()->toDateTimeString(),
                    'meta_type' => 'datetime',
                    'created_at' => now(),
                    'updated_at' => now()
                ]);

                BookingMeta::create([
                    'booking_id' => $booking->id,
                    'meta_key' => 'cancelled_by',
                    'meta_value' => (string)(auth()->id() ?? 'system'),
                    'meta_type' => 'string',
                    'created_at' => now(),
                    'updated_at' => now()
                ]);

                // Update payment status
                $updateData['payment_status'] = 'CANCELLED';
            }

            $booking->update($updateData);

            DB::commit();

            $booking->load(['meta', 'items.meta', 'payments']);

            return response()->json([
                'success' => true,
                'message' => "Booking status updated to {$request->booking_status}",
                'data' => $this->transformBookingForResponse($booking)
            ], 200);
        } catch (Exception $e) {
            DB::rollBack();
            Log::error('Error updating booking status', [
                'booking_id' => $id,
                'error' => $e->getMessage()
            ]);

            return response()->json([
                'success' => false,
                'message' => 'Failed to update booking status',
                'error' => $e->getMessage()
            ], 500);
        }
    }

    /**
     * Remove the specified booking (soft delete)
     */
    public function destroy($id)
    {
        try {
            $booking = Booking::where('booking_type', 'SPECIAL_OCCASIONS')
                ->findOrFail($id);

            // Check if booking can be deleted
            if (in_array($booking->booking_status, ['BOOKED', 'COMPLETED'])) {
                return response()->json([
                    'success' => false,
                    'message' => 'Cannot delete confirmed or completed bookings. Please cancel first.'
                ], 422);
            }

            DB::beginTransaction();

            // Delete related records (cascading deletes should handle this, but being explicit)
            BookingMeta::where('booking_id', $booking->id)->delete();

            foreach ($booking->items as $item) {
                BookingItemMeta::where('booking_item_id', $item->id)->delete();
            }

            BookingItem::where('booking_id', $booking->id)->delete();
            BookingPayment::where('booking_id', $booking->id)->delete();

            // Delete booking
            $booking->delete();

            DB::commit();

            return response()->json([
                'success' => true,
                'message' => 'Booking deleted successfully'
            ], 200);
        } catch (Exception $e) {
            DB::rollBack();
            Log::error('Error deleting booking', [
                'booking_id' => $id,
                'error' => $e->getMessage()
            ]);

            return response()->json([
                'success' => false,
                'message' => 'Failed to delete booking',
                'error' => $e->getMessage()
            ], 500);
        }
    }

    /**
     * Bulk update booking status
     */
    public function bulkUpdateStatus(Request $request)
    {
        try {
            $validator = Validator::make($request->all(), [
                'booking_ids' => 'required|array|min:1',
                'booking_ids.*' => 'required|uuid|exists:bookings,id',
                'booking_status' => 'required|in:PENDING,WAITING,BOOKED,COMPLETED,FAILED,CANCELLED',
                'cancellation_reason' => 'required_if:booking_status,CANCELLED|nullable|string'
            ]);

            if ($validator->fails()) {
                return response()->json([
                    'success' => false,
                    'message' => 'Validation error',
                    'errors' => $validator->errors()
                ], 422);
            }

            DB::beginTransaction();

            $successCount = 0;
            $failedCount = 0;
            $errors = [];

            foreach ($request->booking_ids as $bookingId) {
                try {
                    $booking = Booking::where('booking_type', 'SPECIAL_OCCASIONS')
                        ->findOrFail($bookingId);

                    $updateData = [
                        'booking_status' => $request->booking_status,
                        'updated_at' => now()
                    ];

                    // Handle cancellation
                    if ($request->booking_status === 'CANCELLED') {
                        // Save cancellation reason in booking_meta
                        BookingMeta::create([
                            'booking_id' => $booking->id,
                            'meta_key' => 'cancellation_reason',
                            'meta_value' => $request->cancellation_reason,
                            'meta_type' => 'string',
                            'created_at' => now(),
                            'updated_at' => now()
                        ]);

                        BookingMeta::create([
                            'booking_id' => $booking->id,
                            'meta_key' => 'cancelled_at',
                            'meta_value' => now()->toDateTimeString(),
                            'meta_type' => 'datetime',
                            'created_at' => now(),
                            'updated_at' => now()
                        ]);

                        BookingMeta::create([
                            'booking_id' => $booking->id,
                            'meta_key' => 'cancelled_by',
                            'meta_value' => (string)(auth()->id() ?? 'system'),
                            'meta_type' => 'string',
                            'created_at' => now(),
                            'updated_at' => now()
                        ]);

                        // Update payment status
                        $updateData['payment_status'] = 'CANCELLED';
                    }

                    $booking->update($updateData);
                    $successCount++;
                } catch (Exception $e) {
                    $failedCount++;
                    $errors[] = [
                        'booking_id' => $bookingId,
                        'error' => $e->getMessage()
                    ];
                    Log::error('Error updating booking status in bulk', [
                        'booking_id' => $bookingId,
                        'error' => $e->getMessage()
                    ]);
                }
            }

            DB::commit();

            return response()->json([
                'success' => true,
                'message' => "Successfully updated {$successCount} booking(s). {$failedCount} failed.",
                'data' => [
                    'success_count' => $successCount,
                    'failed_count' => $failedCount,
                    'errors' => $errors
                ]
            ], 200);
        } catch (Exception $e) {
            DB::rollBack();
            Log::error('Error in bulk status update', [
                'error' => $e->getMessage()
            ]);

            return response()->json([
                'success' => false,
                'message' => 'Failed to update booking statuses',
                'error' => $e->getMessage()
            ], 500);
        }
    }

    /**
     * Bulk delete bookings
     */
    public function bulkDelete(Request $request)
    {
        try {
            $validator = Validator::make($request->all(), [
                'booking_ids' => 'required|array|min:1',
                'booking_ids.*' => 'required|uuid|exists:bookings,id'
            ]);

            if ($validator->fails()) {
                return response()->json([
                    'success' => false,
                    'message' => 'Validation error',
                    'errors' => $validator->errors()
                ], 422);
            }

            DB::beginTransaction();

            $successCount = 0;
            $failedCount = 0;
            $errors = [];

            foreach ($request->booking_ids as $bookingId) {
                try {
                    $booking = Booking::where('booking_type', 'SPECIAL_OCCASIONS')
                        ->findOrFail($bookingId);

                    // Check if booking can be deleted
                    if (in_array($booking->booking_status, ['BOOKED', 'COMPLETED'])) {
                        $failedCount++;
                        $errors[] = [
                            'booking_id' => $bookingId,
                            'booking_number' => $booking->booking_number,
                            'error' => 'Cannot delete confirmed or completed bookings. Please cancel first.'
                        ];
                        continue;
                    }

                    // Delete related records
                    BookingMeta::where('booking_id', $booking->id)->delete();

                    foreach ($booking->items as $item) {
                        BookingItemMeta::where('booking_item_id', $item->id)->delete();
                    }

                    BookingItem::where('booking_id', $booking->id)->delete();
                    BookingPayment::where('booking_id', $booking->id)->delete();

                    // Delete booking
                    $booking->delete();
                    $successCount++;
                } catch (Exception $e) {
                    $failedCount++;
                    $errors[] = [
                        'booking_id' => $bookingId,
                        'error' => $e->getMessage()
                    ];
                    Log::error('Error deleting booking in bulk', [
                        'booking_id' => $bookingId,
                        'error' => $e->getMessage()
                    ]);
                }
            }

            DB::commit();

            return response()->json([
                'success' => true,
                'message' => "Successfully deleted {$successCount} booking(s). {$failedCount} failed.",
                'data' => [
                    'success_count' => $successCount,
                    'failed_count' => $failedCount,
                    'errors' => $errors
                ]
            ], 200);
        } catch (Exception $e) {
            DB::rollBack();
            Log::error('Error in bulk delete', [
                'error' => $e->getMessage()
            ]);

            return response()->json([
                'success' => false,
                'message' => 'Failed to delete bookings',
                'error' => $e->getMessage()
            ], 500);
        }
    }

    /**
     * Get available dates for a package
     */
    public function getAvailableDates($optionId)
    {
        try {
            $option = OccasionOption::findOrFail($optionId);

            if ($option->date_type === 'date_range') {
                return response()->json([
                    'success' => true,
                    'date_type' => 'date_range',
                    'data' => [
                        'type' => 'range',
                        'start' => $option->date_range_start,
                        'end' => $option->date_range_end
                    ]
                ]);
            } else {
                $dates = DB::table('occasion_option_dates')
                    ->where('option_id', $optionId)
                    ->where('status', 'active')
                    ->orderBy('event_date')
                    ->get()
                    ->map(function ($date) {
                        return [
                            'date' => $date->event_date,
                            'description' => $date->description ?? null
                        ];
                    });

                return response()->json([
                    'success' => true,
                    'date_type' => 'multiple_dates',
                    'data' => $dates
                ]);
            }
        } catch (Exception $e) {
            Log::error('Error fetching available dates', [
                'option_id' => $optionId,
                'error' => $e->getMessage()
            ]);

            return response()->json([
                'success' => false,
                'message' => 'Failed to fetch dates'
            ], 500);
        }
    }

    /**
     * Get available time slots for a package and date
     */
    public function getAvailableSlots(Request $request)
    {
        try {
            $validator = Validator::make($request->all(), [
                'option_id' => 'required|integer',
                'event_date' => 'required|date'
            ]);

            if ($validator->fails()) {
                return response()->json([
                    'success' => false,
                    'message' => 'Validation error',
                    'errors' => $validator->errors()
                ], 422);
            }

            $option = OccasionOption::findOrFail($request->option_id);

            // Get all time slots for this package
            $timeSlots = DB::table('occasion_option_time_slots')
                ->where('option_id', $request->option_id)
                ->where('status', 'active')
                ->orderBy('sort_order')
                ->get();

            // Get booked slot IDs for this date and option
            $bookedSlots = DB::table('booking_item_meta as event_meta')
                ->join('booking_item_meta as option_meta', function ($join) {
                    $join->on('event_meta.booking_item_id', '=', 'option_meta.booking_item_id')
                        ->where('option_meta.meta_key', '=', 'option_id');
                })
                ->join('booking_item_meta as slot_meta', function ($join) {
                    $join->on('event_meta.booking_item_id', '=', 'slot_meta.booking_item_id')
                        ->where('slot_meta.meta_key', '=', 'slot_id');
                })
                ->join('booking_items as bi', 'event_meta.booking_item_id', '=', 'bi.id')
                ->join('bookings as b', 'bi.booking_id', '=', 'b.id')
                ->where('event_meta.meta_key', 'event_date')
                ->where('event_meta.meta_value', $request->event_date)
                ->where('option_meta.meta_value', (string)$request->option_id)
                ->where('bi.add_ons', 0) // Only count main bookings, not addon items
                ->whereNotIn('b.booking_status', ['CANCELLED', 'FAILED'])
                ->select('slot_meta.meta_value as slot_id')
                ->get()
                ->pluck('slot_id')
                ->map(function ($id) {
                    return (int)$id;
                })
                ->countBy()
                ->toArray();

            // Calculate availability for each slot
            $slots = $timeSlots->map(function ($slot) use ($option, $bookedSlots) {
                $bookedCount = $bookedSlots[$slot->id] ?? 0;

                if ($option->package_mode === 'single') {
                    $isAvailable = $bookedCount === 0;
                    $available = $isAvailable ? 1 : 0;
                } else {
                    $capacity = $slot->capacity ?? $option->slot_capacity ?? 10;
                    $available = max(0, $capacity - $bookedCount);
                    $isAvailable = $available > 0;
                }

                return [
                    'id' => $slot->id,
                    'slot_name' => $slot->slot_name,
                    'slot_name_secondary' => $slot->slot_name_secondary,
                    'start_time' => $slot->start_time,
                    'end_time' => $slot->end_time,
                    'is_available' => $isAvailable,
                    'available' => $available,
                    'capacity' => $option->package_mode === 'single' ? 1 : ($slot->capacity ?? $option->slot_capacity ?? 10)
                ];
            });

            return response()->json([
                'success' => true,
                'package_mode' => $option->package_mode,
                'data' => $slots
            ]);
        } catch (Exception $e) {
            Log::error('Error fetching available slots', [
                'error' => $e->getMessage(),
                'request' => $request->all()
            ]);

            return response()->json([
                'success' => false,
                'message' => 'Failed to fetch time slots'
            ], 500);
        }
    }

    /**
     * Get booking settings for frontend
     */
    public function getBookingSettings()
    {
        try {
            $settings = DB::table('booking_settings')
                ->whereIn('key', ['is_discount', 'discount_ledger_id', 'is_deposit', 'deposit_ledger_id'])
                ->pluck('value', 'key')
                ->toArray();

            return response()->json([
                'success' => true,
                'data' => [
                    'is_discount_enabled' => isset($settings['is_discount']) ? (bool)$settings['is_discount'] : false,
                    'discount_ledger_id' => isset($settings['discount_ledger_id']) ? (int)$settings['discount_ledger_id'] : null,
                    'is_deposit_enabled' => isset($settings['is_deposit']) ? (bool)$settings['is_deposit'] : false,
                    'deposit_ledger_id' => isset($settings['deposit_ledger_id']) ? (int)$settings['deposit_ledger_id'] : null,
                ]
            ], 200);
        } catch (Exception $e) {
            Log::error('Error fetching booking settings', [
                'error' => $e->getMessage()
            ]);

            return response()->json([
                'success' => false,
                'message' => 'Failed to fetch settings'
            ], 500);
        }
    }

    // ========================================
    // ACCOUNT MIGRATION METHODS
    // ========================================

    /**
     * Process account migration for special occasion booking
     * Creates double-entry bookkeeping entries
     *
     * DEBIT: Payment Mode Ledger (Asset/Bank) - Money received
     * CREDIT: Occasion Option Ledger (Income) - Package revenue
     * CREDIT: Addon Service Ledger (Income) - Addon revenue (if applicable)
     * DEBIT: Discount Ledger (Expense) - Discount given (if applicable)
     *
     * @param string $bookingId
     * @param object $option - The occasion option object with ledger_id
     * @param object|null $addonService - The addon service object with ledger_id
     * @return bool
     * @throws \Exception
     */
    protected function accountMigration($bookingId, $option, $addonService = null)
    {
        try {
            Log::info('Starting account migration for special occasion booking', [
                'booking_id' => $bookingId,
                'option_id' => $option->id,
                'addon_service_id' => $addonService ? $addonService->id : null
            ]);

            // Get booking details with relationships
            $booking = Booking::with(['bookingPayments.paymentMode', 'bookingItems', 'bookingMeta'])
                ->findOrFail($bookingId);

            // Get payment details
            $payment = $booking->bookingPayments->first();
            if (!$payment) {
                throw new \Exception('No payment found for special occasion booking');
            }

            $paymentMode = $payment->paymentMode;
            if (!$paymentMode) {
                throw new \Exception('Payment mode not found');
            }

            // Check if payment mode has ledger_id (DEBIT side - Asset/Bank)
            if (empty($paymentMode->ledger_id)) {
                Log::warning('Payment mode does not have ledger_id', [
                    'payment_mode_id' => $paymentMode->id,
                    'payment_mode_name' => $paymentMode->name
                ]);
                throw new \Exception('Payment mode ledger configuration missing');
            }

            $debitLedgerId = $paymentMode->ledger_id;

            // ========================================
            // PREPARE CREDIT ENTRIES (Income side)
            // ========================================
            $creditEntries = [];
            $totalCreditAmount = 0;

            // 1. Main Package/Option Credit Entry
            $mainItem = $booking->bookingItems->where('add_ons', 0)->first();
            if (!$mainItem) {
                throw new \Exception('No main booking item found');
            }

            $optionLedgerId = null;
            if (!empty($option->ledger_id)) {
                $optionLedgerId = $option->ledger_id;
            } else {
                // Get or create default Special Occasions Income ledger
                $optionLedgerId = $this->getOrCreateSpecialOccasionsIncomeLedger();
            }

            $packageAmount = (float)$mainItem->total_price;
            $creditEntries[] = [
                'ledger_id' => $optionLedgerId,
                'amount' => $packageAmount,
                'details' => "Special Occasion: {$mainItem->item_name} - {$option->name} ({$booking->booking_number})"
            ];
            $totalCreditAmount += $packageAmount;

            Log::info('Package credit entry prepared', [
                'ledger_id' => $optionLedgerId,
                'amount' => $packageAmount
            ]);

            // 2. Addon Service Credit Entry (if applicable)
            if ($addonService) {
                $addonItem = $booking->bookingItems->where('add_ons', 1)->first();
                if ($addonItem) {
                    $addonLedgerId = null;
                    if (!empty($addonService->ledger_id)) {
                        $addonLedgerId = $addonService->ledger_id;
                    } else {
                        // Use the same Special Occasions Income ledger
                        $addonLedgerId = $this->getOrCreateSpecialOccasionsIncomeLedger();
                    }

                    $addonAmount = (float)$addonItem->total_price;
                    $creditEntries[] = [
                        'ledger_id' => $addonLedgerId,
                        'amount' => $addonAmount,
                        'details' => "Addon Service: {$addonService->name} ({$booking->booking_number})"
                    ];
                    $totalCreditAmount += $addonAmount;

                    Log::info('Addon service credit entry prepared', [
                        'ledger_id' => $addonLedgerId,
                        'amount' => $addonAmount
                    ]);
                }
            }

            // ========================================
            // HANDLE DISCOUNT (if applicable)
            // ========================================
            $discountAmount = (float)$booking->discount_amount;
            $discountLedgerId = null;

            if ($discountAmount > 0) {
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
                    'amount' => $discountAmount
                ]);
            }
            // ========================================
            // GENERATE ENTRY CODE
            // ========================================
            $date = $booking->booking_date ?? now();
            if (is_string($date)) {
                $date = Carbon::parse($date);
            }
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

            // ========================================
            // PREPARE NARRATION
            // ========================================
            $devoteeInfo = $this->getDevoteeInfoFromMeta($booking);

            $narration = "Special Occasion Booking ({$booking->booking_number})\n";
            $narration .= "Event: {$mainItem->item_name}\n";
            $narration .= "Package: {$option->name}\n";
            if (!empty($devoteeInfo['name_english'])) {
                $narration .= "Devotee: {$devoteeInfo['name_english']}\n";
            }
            if (!empty($devoteeInfo['name_chinese'])) {
                $narration .= "ä¸­æ–‡å: {$devoteeInfo['name_chinese']}\n";
            }
            if (!empty($devoteeInfo['nric'])) {
                $narration .= "NRIC: {$devoteeInfo['nric']}\n";
            }

            // ========================================
            // CALCULATE TOTALS
            // ========================================
            // DR Total = Paid amount (what we received)
            // CR Total = Income - Discount (net income)
            $sub_total = (float) $booking->subtotal;
            $paid_amount = (float) $booking->paid_amount;

            // For balanced double-entry, both should be equal
            // If there's a discount, we need to handle it specially
            // DR: Cash/Bank (paid_amount)
            // CR: Income (total before discount)
            // DR: Discount (discount amount)

            // Actually for a receipt with discount:
            // DR: Cash/Bank = paid_amount
            // CR: Income = subtotal (before discount)
            // DR: Discount Expense = discount_amount
            // This balances because: paid_amount + discount = subtotal

            Log::info('Entry totals calculated', [
                'dr_total' => $sub_total,
                'cr_total' => $sub_total,
                'total_credit_amount' => $totalCreditAmount,
                'discount_amount' => $discountAmount
            ]);

            // ========================================
            // CREATE ENTRY RECORD
            // ========================================
            $entryId = DB::table('entries')->insertGetId([
                'entrytype_id' => 1, // Receipt type
                'number' => $entryCode,
                'date' => $date,
                'dr_total' => $sub_total, // Total debits
                'cr_total' => $sub_total, // Total credits (before discount)
                'narration' => $narration,
                'inv_id' => $bookingId,
                'inv_type' => 5, // Special Occasion type (you may define this)
                'entry_code' => $entryCode,
                'created_by' => auth()->id(),
                'user_id' => auth()->id(),
                'created_at' => now(),
                'updated_at' => now()
            ]);

            Log::info('Entry created for special occasion booking', [
                'entry_id' => $entryId,
                'entry_code' => $entryCode
            ]);


            // ========================================
            // CREATE DEBIT ENTRY ITEM (Payment received)
            // ========================================
            DB::table('entryitems')->insert([
                'entry_id' => $entryId,
                'ledger_id' => $debitLedgerId,
                'amount' => $paid_amount,
                'details' => "Special Occasion Payment ({$booking->booking_number})",
                'dc' => 'D', // Debit
                'is_discount' => 0,
                'created_at' => now(),
                'updated_at' => now()
            ]);

            Log::info('Debit entry item created (payment received)', [
                'ledger_id' => $debitLedgerId,
                'amount' => $paid_amount
            ]);

            // ========================================
            // CREATE CREDIT ENTRY ITEMS (Income)
            // ========================================
            foreach ($creditEntries as $creditEntry) {
                DB::table('entryitems')->insert([
                    'entry_id' => $entryId,
                    'ledger_id' => $creditEntry['ledger_id'],
                    'amount' => $creditEntry['amount'],
                    'details' => $creditEntry['details'],
                    'dc' => 'C', // Credit
                    'is_discount' => 0,
                    'created_at' => now(),
                    'updated_at' => now()
                ]);

                Log::info('Credit entry item created (income)', [
                    'ledger_id' => $creditEntry['ledger_id'],
                    'amount' => $creditEntry['amount']
                ]);
            }

            // ========================================
            // CREATE DISCOUNT DEBIT ENTRY (if applicable)
            // ========================================
            if ($discountAmount > 0 && $discountLedgerId) {
                DB::table('entryitems')->insert([
                    'entry_id' => $entryId,
                    'ledger_id' => $discountLedgerId,
                    'amount' => $discountAmount,
                    'details' => "Discount - Special Occasion ({$booking->booking_number})",
                    'dc' => 'D', // Debit (expense)
                    'is_discount' => 1,
                    'created_at' => now(),
                    'updated_at' => now()
                ]);

                Log::info('Discount debit entry item created', [
                    'ledger_id' => $discountLedgerId,
                    'amount' => $discountAmount
                ]);
            }

            // ========================================
            // UPDATE BOOKING TO MARK ACCOUNT MIGRATION COMPLETE
            // ========================================
            $booking->update(['account_migration' => 1]);

            Log::info('Account migration completed successfully for special occasion booking', [
                'booking_id' => $bookingId,
                'booking_number' => $booking->booking_number,
                'entry_id' => $entryId,
                'entry_code' => $entryCode
            ]);

            return true;
        } catch (\Exception $e) {
            Log::error('Error in special occasion account migration', [
                'booking_id' => $bookingId,
                'error' => $e->getMessage(),
                'trace' => $e->getTraceAsString()
            ]);
            throw $e;
        }
    }

    /**
     * Get or create Special Occasions Income ledger
     * Creates under Incomes group (8000) if not exists
     *
     * @return int
     */
    private function getOrCreateSpecialOccasionsIncomeLedger()
    {
        // Get or create "Incomes" group
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

        // Get or create "Special Occasions Income" ledger
        $specialOccasionsLedger = DB::table('ledgers')
            ->where('name', 'Special Occasions Income')
            ->where('group_id', $incomesGroupId)
            ->first();

        if (!$specialOccasionsLedger) {
            // Get the next right_code for this group
            $lastRightCode = DB::table('ledgers')
                ->where('group_id', $incomesGroupId)
                ->where('left_code', '8000')
                ->orderBy('right_code', 'desc')
                ->value('right_code');

            $newRightCode = $lastRightCode ? str_pad(((int)$lastRightCode + 1), 4, '0', STR_PAD_LEFT) : '0001';

            $specialOccasionsLedgerId = DB::table('ledgers')->insertGetId([
                'group_id' => $incomesGroupId,
                'name' => 'Special Occasions Income',
                'left_code' => '8000',
                'right_code' => $newRightCode,
                'type' => 0,
                'created_at' => now(),
                'updated_at' => now()
            ]);

            Log::info('Created Special Occasions Income ledger', [
                'ledger_id' => $specialOccasionsLedgerId,
                'group_id' => $incomesGroupId
            ]);
        } else {
            $specialOccasionsLedgerId = $specialOccasionsLedger->id;
        }

        return $specialOccasionsLedgerId;
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

    /**
     * Get devotee information from booking meta
     *
     * @param Booking $booking
     * @return array
     */
    private function getDevoteeInfoFromMeta($booking)
    {
        $meta = [];

        if ($booking->bookingMeta) {
            foreach ($booking->bookingMeta as $metaItem) {
                $meta[$metaItem->meta_key] = $metaItem->meta_value;
            }
        } elseif ($booking->meta) {
            foreach ($booking->meta as $metaItem) {
                $meta[$metaItem->meta_key] = $metaItem->meta_value;
            }
        }

        return [
            'name_english' => $meta['name_english'] ?? '',
            'name_chinese' => $meta['name_chinese'] ?? '',
            'nric' => $meta['nric'] ?? '',
            'email' => $meta['email'] ?? '',
            'contact_no' => $meta['contact_no'] ?? ''
        ];
    }

    // ========================================
    // PRIVATE HELPER METHODS
    // ========================================

    /**
     * Generate unique booking number
     * Format: TEBD2025121600000006 (TEBD for Dev, TEBL for Live)
     */
    private function generateBookingNumber()
    {
        $prefix = config('app.env') === 'production' ? 'TEBL' : 'TEBD';
        $date = Carbon::now()->format('Ymd');

        // Get last booking number for today
        $lastBooking = Booking::where('booking_number', 'like', $prefix . $date . '%')
            ->orderBy('booking_number', 'desc')
            ->lockForUpdate()
            ->first();

        if ($lastBooking) {
            // Extract sequence number and increment
            $lastSequence = (int)substr($lastBooking->booking_number, -8);
            $newSequence = $lastSequence + 1;
        } else {
            $newSequence = 1;
        }

        // Format: TEBD20251216 + 8-digit sequence
        return $prefix . $date . str_pad($newSequence, 8, '0', STR_PAD_LEFT);
    }

    /**
     * Transform booking data for frontend response
     * PROPERLY SEPARATES: Included Services vs Addon Services
     * WITH DEBUG LOGGING AND ERROR HANDLING
     */
    private function transformBookingForResponse($booking)
    {
        // Extract devotee info from meta
        $devoteeInfo = [];
        $discountAmount = 0;
        $depositAmount = 0;
        $balanceDue = 0;

        foreach ($booking->meta as $meta) {
            $devoteeInfo[$meta->meta_key] = $meta->meta_value;

            if ($meta->meta_key === 'discount_amount') {
                $discountAmount = (float)$meta->meta_value;
            }
            if ($meta->meta_key === 'deposit_amount') {
                $depositAmount = (float)$meta->meta_value;
            }
            if ($meta->meta_key === 'balance_due') {
                $balanceDue = (float)$meta->meta_value;
            }
        }

        // Extract MAIN PACKAGE ITEM (add_ons = 0)
        $mainItem = $booking->items->where('add_ons', 0)->first();

        $itemMeta = [];
        $occasionAmount = 0;
        $occasionName = null;
        $occasionNameSecondary = null;
        $optionName = null;
        $optionNameSecondary = null;
        $slotInfo = null;
        $eventDate = null;
        $includedServices = []; // Initialize empty array

        if ($mainItem) {
            // Get main package details
            foreach ($mainItem->meta as $meta) {
                $itemMeta[$meta->meta_key] = $meta->meta_value;
            }

            Log::info('Main item meta loaded', [
                'booking_id' => $booking->id,
                'booking_number' => $booking->booking_number,
                'meta_keys' => array_keys($itemMeta),
                'has_option_id' => isset($itemMeta['option_id'])
            ]);

            $occasionName = $mainItem->item_name;
            $occasionNameSecondary = $mainItem->item_name_secondary;
            $optionName = $itemMeta['option_name'] ?? null;
            $optionNameSecondary = $itemMeta['option_name_secondary'] ?? null;
            $occasionAmount = $mainItem->total_price;
            $eventDate = $itemMeta['event_date'] ?? null;

            // Build slot info
            if (isset($itemMeta['slot_name'])) {
                $slotInfo = $itemMeta['slot_name'];
                if (isset($itemMeta['slot_time'])) {
                    $slotInfo .= ' (' . $itemMeta['slot_time'] . ')';
                }
            }

            // ====================================================================
            // GET INCLUDED SERVICES
            // ====================================================================
            if (isset($itemMeta['option_id'])) {
                $optionId = $itemMeta['option_id'];

                Log::info('Querying included services', [
                    'booking_id' => $booking->id,
                    'booking_number' => $booking->booking_number,
                    'option_id' => $optionId
                ]);

                try {
                    $includedServicesData = DB::table('occasion_option_services as oos')
                        ->join('occasion_services_master as osm', 'oos.service_id', '=', 'osm.id')
                        ->where('oos.option_id', $optionId)
                        ->where('osm.is_addon', false)
                        ->where('osm.status', 'active')
                        ->select(
                            'osm.id as service_id',
                            'osm.name as service_name',
                            'osm.name_secondary as service_name_secondary'
                        )
                        ->get();

                    Log::info('Included services query completed', [
                        'booking_id' => $booking->id,
                        'booking_number' => $booking->booking_number,
                        'option_id' => $optionId,
                        'found_count' => $includedServicesData->count(),
                        'services' => $includedServicesData->toArray()
                    ]);

                    foreach ($includedServicesData as $service) {
                        $includedServices[] = [
                            'service_id' => $service->service_id,
                            'service_name' => $service->service_name,
                            'service_name_secondary' => $service->service_name_secondary
                        ];
                    }
                } catch (\Exception $e) {
                    Log::error('Error querying included services', [
                        'booking_id' => $booking->id,
                        'booking_number' => $booking->booking_number,
                        'option_id' => $optionId,
                        'error' => $e->getMessage()
                    ]);
                }
            } else {
                Log::warning('option_id not found in booking_item_meta', [
                    'booking_id' => $booking->id,
                    'booking_number' => $booking->booking_number,
                    'booking_item_id' => $mainItem->id,
                    'available_meta_keys' => array_keys($itemMeta)
                ]);
            }
        } else {
            Log::warning('No main booking item found (add_ons=0)', [
                'booking_id' => $booking->id,
                'booking_number' => $booking->booking_number,
                'total_items' => $booking->items->count()
            ]);
        }

        // Log final included services
        Log::info('Final included services array', [
            'booking_id' => $booking->id,
            'booking_number' => $booking->booking_number,
            'count' => count($includedServices),
            'services' => $includedServices
        ]);

        // ========================================================================
        // Extract ADDON SERVICES (add_ons = 1)
        // ========================================================================
        $addonServices = [];
        $addonItems = $booking->items->where('add_ons', 1);

        foreach ($addonItems as $addon) {
            $addonMeta = [];
            foreach ($addon->meta as $meta) {
                $addonMeta[$meta->meta_key] = $meta->meta_value;
            }

            $addonServices[] = [
                'id' => $addon->id,
                'service_id' => $addon->item_id,
                'service_name' => $addon->item_name,
                'service_name_secondary' => $addon->item_name_secondary,
                'quantity' => $addon->quantity,
                'unit_price' => (float)$addon->unit_price,
                'total_price' => (float)$addon->total_price,
                'ledger_id' => $addonMeta['ledger_id'] ?? null
            ];
        }

        $addonTotal = $addonItems->sum('total_price');

        Log::info('Final addon services array', [
            'booking_id' => $booking->id,
            'booking_number' => $booking->booking_number,
            'count' => count($addonServices),
            'total' => $addonTotal
        ]);

        // Get payment method
        $paymentMethod = $booking->payment_method;
        if ($booking->payments->isNotEmpty()) {
            $firstPayment = $booking->payments->first();
            $paymentMethod = $firstPayment->payment_method ?? $paymentMethod;
        }

        // Build response
        $response = [
            // Basic booking info
            'id' => $booking->id,
            'booking_code' => $booking->booking_number,
            'booking_number' => $booking->booking_number,
            'booking_date' => $booking->booking_date,
            'booking_status' => $booking->booking_status,
            'payment_status' => $booking->payment_status,
            'status' => strtolower($booking->booking_status),

            // Devotee info
            'name_chinese' => $devoteeInfo['name_chinese'] ?? '-',
            'name_english' => $devoteeInfo['name_english'] ?? '-',
            'nric' => $devoteeInfo['nric'] ?? '-',
            'email' => $devoteeInfo['email'] ?? '-',
            'contact_no' => $devoteeInfo['contact_no'] ?? '-',

            // Occasion info
            'occasion_name' => $occasionName ?? 'N/A',
            'occasion_name_secondary' => $occasionNameSecondary,
            'occasion_option' => $optionName ?? 'N/A',
            'occasion_option_secondary' => $optionNameSecondary,
            'occasion_amount' => $occasionAmount,
            'package_amount' => $occasionAmount,
            'event_date' => $eventDate,
            'slot_info' => $slotInfo,

            // ===================================================================
            // INCLUDED SERVICES (part of package, NO additional charge)
            // ===================================================================
            'included_services' => $includedServices,
            'included_services_count' => count($includedServices),

            // ===================================================================
            // ADDON SERVICES (separate services WITH additional charges)
            // ===================================================================
            'addon_services' => $addonServices,
            'addon_count' => count($addonServices),
            'addon_total' => $addonTotal,

            // Payment info
            'payment_methods' => $paymentMethod ?? '-',
            'payment_method' => $paymentMethod ?? '-',
            'subtotal' => $booking->subtotal,
            'discount_amount' => $discountAmount,
            'total_amount' => $booking->total_amount,
            'deposit_amount' => $depositAmount,
            'balance_due' => $balanceDue,
            'paid_amount' => $booking->paid_amount,

            // Account migration status
            'account_migration' => $booking->account_migration ?? 0,

            // Other fields
            'remark' => $booking->special_instructions,
            'remarks' => $booking->special_instructions,
            'print_option' => $booking->print_option,
            'created_at' => $booking->created_at,
            'updated_at' => $booking->updated_at,

            // Nested structure
            'devotee_info' => $devoteeInfo,
            'item_meta' => $itemMeta
        ];

        // Log final response structure
        Log::info('Transform response completed', [
            'booking_id' => $booking->id,
            'booking_number' => $booking->booking_number,
            'has_included_services' => !empty($includedServices),
            'included_count' => count($includedServices),
            'has_addon_services' => !empty($addonServices),
            'addon_count' => count($addonServices)
        ]);

        // ========================================================================
        // ADD RELOCATION FLAGS (STEP 1 from Documentation)
        // ========================================================================
        $enableRelocation = false;
        $enableTableAssignment = false;
        $tableLayouts = [];
        $currentTableNumber = null;
        $currentRowNumber = null;
        $currentColumnNumber = null;
        $currentSeatNumber = null;

        // Get occasion settings - FIXED: Get occasion_id from option_id via occasion_options table
        $occasionId = null;

        // First try to get from itemMeta if it exists (for future bookings that store it)
        if (isset($itemMeta['occasion_id'])) {
            $occasionId = $itemMeta['occasion_id'];
        }
        // Otherwise, look up occasion_id from the option_id
        elseif (isset($itemMeta['option_id'])) {
            $optionData = DB::table('occasion_options')
                ->where('id', $itemMeta['option_id'])
                ->select('occasion_id')
                ->first();

            if ($optionData) {
                $occasionId = $optionData->occasion_id;
            }

            Log::info('Retrieved occasion_id from option_id', [
                'booking_id' => $booking->id,
                'option_id' => $itemMeta['option_id'],
                'occasion_id' => $occasionId
            ]);
        }

        // Now get the occasion settings if we have an occasion_id
        if ($occasionId) {
            $occasionSettings = DB::table('special_occ_master')
                ->where('id', $occasionId)
                ->select('enable_relocation', 'enable_table_assignment', 'table_layouts')
                ->first();

            if ($occasionSettings) {
                $enableRelocation = (bool)($occasionSettings->enable_relocation ?? false);
                $enableTableAssignment = (bool)($occasionSettings->enable_table_assignment ?? false);
                $tableLayouts = json_decode($occasionSettings->table_layouts ?? '[]', true) ?: [];

                Log::info('Relocation flags loaded for booking', [
                    'booking_id' => $booking->id,
                    'booking_number' => $booking->booking_number,
                    'occasion_id' => $occasionId,
                    'enable_relocation' => $enableRelocation,
                    'enable_table_assignment' => $enableTableAssignment,
                    'table_layouts_count' => count($tableLayouts)
                ]);
            }
        } else {
            Log::warning('Could not determine occasion_id for relocation flags', [
                'booking_id' => $booking->id,
                'booking_number' => $booking->booking_number,
                'available_meta_keys' => array_keys($itemMeta)
            ]);
        }

        // Get current seat/table assignment from booking meta
        $currentTableNumber = $devoteeInfo['table_number'] ?? null;
        $currentRowNumber = $devoteeInfo['row_number'] ?? null;
        $currentColumnNumber = $devoteeInfo['column_number'] ?? null;
        $currentSeatNumber = $devoteeInfo['seat_number'] ?? null;

        // Add relocation data to response
        $response['enable_relocation'] = $enableRelocation;
        $response['enable_table_assignment'] = $enableTableAssignment;
        $response['table_layouts'] = $tableLayouts;
        $response['current_assignment'] = [
            'table_number' => $currentTableNumber,
            'row_number' => $currentRowNumber,
            'column_number' => $currentColumnNumber,
            'seat_number' => $currentSeatNumber,
        ];

        return $response;
    }

    /**
     * Relocate a booking to a new seat/table/number (SIMPLIFIED VERSION)
     * Works with JSON table_layouts structure, no separate tables table needed
     */
    /**
     * Relocate a booking to a new seat/table/number (SIMPLIFIED VERSION)
     * Enhanced with detailed error handling and validation
     */
    public function relocateBooking(Request $request, $bookingId)
    {
        try {
            // Step 1: Validation
            $validator = Validator::make($request->all(), [
                'new_assign_number' => 'required|string|max:50',
                'new_table_number' => 'nullable|string|max:100',
                'new_row_number' => 'nullable|integer|min:1',
                'new_column_number' => 'nullable|integer|min:1',
                'reason' => 'required|string|max:500',
                'change_type' => 'required|in:manual,forced,MANUAL,FORCED',
                'admin_confirmation' => 'required|boolean|accepted',
            ]);

            if ($validator->fails()) {
                Log::warning('Relocation validation failed', [
                    'booking_id' => $bookingId,
                    'errors' => $validator->errors()->toArray()
                ]);

                return response()->json([
                    'success' => false,
                    'message' => 'Validation failed: ' . $validator->errors()->first(),
                    'errors' => $validator->errors()
                ], 422);
            }

            Log::info('Starting relocation process', [
                'booking_id' => $bookingId,
                'request_data' => $request->all()
            ]);

            DB::beginTransaction();

            // Step 2: Get the booking
            $booking = Booking::with(['items.meta', 'meta'])
                ->where('id', $bookingId)
                ->where('booking_type', 'SPECIAL_OCCASIONS')
                ->first();

            if (!$booking) {
                throw new Exception('Booking not found or invalid booking type');
            }

            Log::info('Booking loaded', [
                'booking_id' => $booking->id,
                'booking_number' => $booking->booking_number,
                'items_count' => $booking->items->count(),
                'meta_count' => $booking->meta->count()
            ]);

            // Step 3: Get occasion_id and event_date from booking
            $occasionId = $this->getOccasionIdFromBooking($booking);
            $eventDate = $this->getEventDateFromBooking($booking);

            Log::info('Retrieved booking details', [
                'occasion_id' => $occasionId,
                'event_date' => $eventDate
            ]);

            if (!$occasionId) {
                throw new Exception('Cannot determine occasion ID from booking. Please ensure the booking has valid occasion data.');
            }

            if (!$eventDate) {
                throw new Exception('Cannot determine event date from booking. Please ensure the booking has valid event date.');
            }

            // Step 4: Check if relocation is enabled for this event
            $occasion = SpecialOccasion::find($occasionId);

            if (!$occasion) {
                throw new Exception("Occasion with ID {$occasionId} not found");
            }

            if (!$occasion->enable_relocation) {
                throw new Exception('Relocation is not enabled for this event. Please enable it in the event settings.');
            }

            Log::info('Relocation is enabled for this event', [
                'occasion_name' => $occasion->occasion_name_primary
            ]);

            // Step 5: Get current assignment from booking_meta
            $currentSeatMeta = BookingMeta::where('booking_id', $booking->id)
                ->where('meta_key', 'seat_number')
                ->first();

            $currentTableMeta = BookingMeta::where('booking_id', $booking->id)
                ->where('meta_key', 'table_number')
                ->first();

            $currentRowMeta = BookingMeta::where('booking_id', $booking->id)
                ->where('meta_key', 'row_number')
                ->first();

            $currentColumnMeta = BookingMeta::where('booking_id', $booking->id)
                ->where('meta_key', 'column_number')
                ->first();

            $oldAssignment = [
                'table_number' => $currentTableMeta ? $currentTableMeta->meta_value : null,
                'row_number' => $currentRowMeta ? $currentRowMeta->meta_value : null,
                'column_number' => $currentColumnMeta ? $currentColumnMeta->meta_value : null,
                'seat_number' => $currentSeatMeta ? $currentSeatMeta->meta_value : null,
            ];

            Log::info('Current assignment retrieved', [
                'old_assignment' => $oldAssignment
            ]);

            // Get new table name from request
            $newTableNumber = $request->input('new_table_number', null);
            $newAssignNumber = $request->new_assign_number;

            // Step 6: Check for conflicts - is this seat already taken?
            try {
                // Build base query
                $conflictQuery = Booking::where('booking_type', 'SPECIAL_OCCASIONS')
                    ->where('booking_status', '!=', 'CANCELLED')
                    ->where('id', '!=', $bookingId);

                // Check if there are any bookings for this occasion and date
                $mainItem = $booking->items->where('add_ons', 0)->first();
                if (!$mainItem) {
                    throw new Exception('No main booking item found');
                }

                // Get option_id from the main item
                $optionMeta = $mainItem->meta->where('meta_key', 'option_id')->first();
                $optionId = $optionMeta ? $optionMeta->meta_value : null;

                Log::info('Checking for conflicts', [
                    'occasion_id' => $occasionId,
                    'event_date' => $eventDate,
                    'option_id' => $optionId,
                    'new_table' => $newTableNumber,
                    'new_seat' => $newAssignNumber
                ]);

                // Check for existing bookings with same seat assignment
                $conflictingBooking = Booking::where('booking_type', 'SPECIAL_OCCASIONS')
                    ->where('booking_status', '!=', 'CANCELLED')
                    ->where('id', '!=', $bookingId)
                    ->whereHas('meta', function ($q) use ($newAssignNumber) {
                        $q->where('meta_key', 'seat_number')
                            ->where('meta_value', $newAssignNumber);
                    })
                    ->when($newTableNumber, function ($query) use ($newTableNumber) {
                        $query->whereHas('meta', function ($q) use ($newTableNumber) {
                            $q->where('meta_key', 'table_number')
                                ->where('meta_value', $newTableNumber);
                        });
                    })
                    ->whereHas('items', function ($q) use ($occasionId, $eventDate) {
                        $q->where('add_ons', 0)
                            ->whereHas('meta', function ($mq) use ($occasionId) {
                                $mq->where('meta_key', 'occasion_id')
                                    ->where('meta_value', (string)$occasionId);
                            })
                            ->whereHas('meta', function ($mq) use ($eventDate) {
                                $mq->where('meta_key', 'event_date')
                                    ->where('meta_value', $eventDate);
                            });
                    })
                    ->first();

                if ($conflictingBooking) {
                    $conflictDevoteeName = $this->getDevoteeName($conflictingBooking);

                    Log::warning('Seat conflict detected', [
                        'conflicting_booking' => $conflictingBooking->booking_number,
                        'devotee' => $conflictDevoteeName
                    ]);

                    return response()->json([
                        'success' => false,
                        'message' => "Seat {$newAssignNumber} is already occupied by another booking",
                        'conflict' => true,
                        'conflict_details' => [
                            'booking_id' => $conflictingBooking->id,
                            'booking_number' => $conflictingBooking->booking_number,
                            'devotee_name' => $conflictDevoteeName
                        ]
                    ], 409);
                }

                Log::info('No conflicts found, proceeding with relocation');
            } catch (Exception $conflictCheckError) {
                Log::error('Error during conflict check', [
                    'error' => $conflictCheckError->getMessage(),
                    'trace' => $conflictCheckError->getTraceAsString()
                ]);
                throw new Exception('Failed to check seat availability: ' . $conflictCheckError->getMessage());
            }

            // Step 7: Update booking_meta with new assignment
            try {
                BookingMeta::updateOrCreate(
                    ['booking_id' => $booking->id, 'meta_key' => 'seat_number'],
                    ['meta_value' => $newAssignNumber, 'meta_type' => 'string', 'updated_at' => now()]
                );

                if ($newTableNumber) {
                    BookingMeta::updateOrCreate(
                        ['booking_id' => $booking->id, 'meta_key' => 'table_number'],
                        ['meta_value' => $newTableNumber, 'meta_type' => 'string', 'updated_at' => now()]
                    );
                }

                if ($request->filled('new_row_number')) {
                    BookingMeta::updateOrCreate(
                        ['booking_id' => $booking->id, 'meta_key' => 'row_number'],
                        ['meta_value' => (string)$request->new_row_number, 'meta_type' => 'integer', 'updated_at' => now()]
                    );
                }

                if ($request->filled('new_column_number')) {
                    BookingMeta::updateOrCreate(
                        ['booking_id' => $booking->id, 'meta_key' => 'column_number'],
                        ['meta_value' => (string)$request->new_column_number, 'meta_type' => 'integer', 'updated_at' => now()]
                    );
                }

                Log::info('Booking meta updated successfully');
            } catch (Exception $metaUpdateError) {
                Log::error('Error updating booking meta', [
                    'error' => $metaUpdateError->getMessage()
                ]);
                throw new Exception('Failed to update seat assignment: ' . $metaUpdateError->getMessage());
            }

            // Step 8: CREATE RELOCATION LOG IN CORRECT TABLE
            try {
                $relocationLogId = DB::table('special_occasion_relocation_history')->insertGetId([
                    'occasion_id' => $occasionId,
                    'booking_id' => $bookingId,
                    'assignment_id' => null,
                    'old_table_name' => $oldAssignment['table_number'],
                    'old_row_number' => $oldAssignment['row_number'] ? (int)$oldAssignment['row_number'] : null,
                    'old_column_number' => $oldAssignment['column_number'] ? (int)$oldAssignment['column_number'] : null,
                    'old_assign_number' => $oldAssignment['seat_number'],
                    'new_table_name' => $newTableNumber,
                    'new_row_number' => $request->new_row_number,
                    'new_column_number' => $request->new_column_number,
                    'new_assign_number' => $newAssignNumber,
                    'action_type' => strtoupper($request->change_type),
                    'change_reason' => $request->reason,
                    'changed_by' => auth()->id(),
                    'changed_at' => now(),
                    'created_at' => now(),
                    'updated_at' => now()
                ], 'id');

                Log::info('Relocation history record created', [
                    'log_id' => $relocationLogId
                ]);
            } catch (Exception $logError) {
                Log::error('Error creating relocation log', [
                    'error' => $logError->getMessage()
                ]);
                throw new Exception('Failed to create relocation log: ' . $logError->getMessage());
            }

            // Step 9: Update booking timestamp to trigger receipt regeneration
            try {
                $booking->updated_at = now();
                $booking->save();

                Log::info('Booking timestamp updated for receipt regeneration');
            } catch (Exception $timestampError) {
                Log::warning('Failed to update booking timestamp', [
                    'error' => $timestampError->getMessage()
                ]);
                // Non-critical, continue
            }

            // Step 10: Regenerate receipt with updated seat info and QR code
            try {
                // Generate QR code for the booking
                $qrController = new \App\Http\Controllers\QRCodeController();
                $qrCodeBase64 = $qrController->generateQRCodeBase64($bookingId);

                // Get admin name who made the change
                $admin = \App\Models\User::find(auth()->id());
                $adminName = $admin ? ($admin->name ?? $admin->username ?? 'Admin') : 'System';

                // Prepare seat assignment data for receipt
                $seatAssignment = [
                    'table_number' => $newTableNumber,
                    'row_number' => $request->new_row_number,
                    'column_number' => $request->new_column_number,
                    'seat_number' => $newAssignNumber,
                    'last_updated' => now(),
                    'updated_by' => $adminName,
                    'relocated' => true  // Flag to show relocated badge
                ];

                // Store seat assignment and QR code in booking meta for receipt generation
                BookingMeta::updateOrCreate(
                    ['booking_id' => $booking->id, 'meta_key' => 'seat_assignment_data'],
                    ['meta_value' => json_encode($seatAssignment), 'meta_type' => 'json', 'updated_at' => now()]
                );

                BookingMeta::updateOrCreate(
                    ['booking_id' => $booking->id, 'meta_key' => 'qr_code_base64'],
                    ['meta_value' => $qrCodeBase64, 'meta_type' => 'text', 'updated_at' => now()]
                );

                Log::info('Receipt data updated with QR code and seat assignment', [
                    'booking_id' => $bookingId,
                    'has_qr_code' => !empty($qrCodeBase64),
                    'seat_assignment' => $seatAssignment
                ]);
            } catch (Exception $receiptError) {
                Log::warning('Failed to update receipt data', [
                    'error' => $receiptError->getMessage()
                ]);
                // Non-critical, continue
            }

            DB::commit();

            $newAssignment = [
                'table_number' => $newTableNumber,
                'row_number' => $request->new_row_number,
                'column_number' => $request->new_column_number,
                'seat_number' => $newAssignNumber,
            ];

            Log::info('Booking relocated successfully', [
                'booking_id' => $bookingId,
                'booking_number' => $booking->booking_number,
                'old_assignment' => $oldAssignment,
                'new_assignment' => $newAssignment
            ]);

            return response()->json([
                'success' => true,
                'message' => 'Booking relocated successfully',
                'data' => [
                    'booking_id' => $bookingId,
                    'booking_number' => $booking->booking_number,
                    'old_assignment' => $oldAssignment,
                    'new_assignment' => $newAssignment,
                    'relocated_at' => now()->toISOString()
                ]
            ], 200);
        } catch (Exception $e) {
            DB::rollBack();

            Log::error('Error relocating booking', [
                'booking_id' => $bookingId,
                'error_message' => $e->getMessage(),
                'error_file' => $e->getFile(),
                'error_line' => $e->getLine(),
                'trace' => $e->getTraceAsString()
            ]);

            return response()->json([
                'success' => false,
                'message' => $e->getMessage(),
                'error_details' => config('app.debug') ? [
                    'file' => $e->getFile(),
                    'line' => $e->getLine(),
                ] : null
            ], 500);
        }
    }
    /**
     * Swap seats/numbers between two bookings
     * STEP 1.3: Allow swapping between devotees
     */
    public function swapBookings(Request $request)
    {
        try {
            // Validate request
            $validator = Validator::make($request->all(), [
                'booking_id_1' => 'required|uuid|exists:bookings,id',
                'booking_id_2' => 'required|uuid|exists:bookings,id|different:booking_id_1',
                'reason' => 'required|string|max:500',
                'admin_confirmation' => 'required|boolean|accepted',
            ]);

            if ($validator->fails()) {
                return response()->json([
                    'success' => false,
                    'message' => 'Validation failed',
                    'errors' => $validator->errors()
                ], 422);
            }

            DB::beginTransaction();

            // Get both bookings
            $booking1 = Booking::with(['items.meta', 'meta'])
                ->where('id', $request->booking_id_1)
                ->where('booking_type', 'SPECIAL_OCCASIONS')
                ->firstOrFail();

            $booking2 = Booking::with(['items.meta', 'meta'])
                ->where('id', $request->booking_id_2)
                ->where('booking_type', 'SPECIAL_OCCASIONS')
                ->firstOrFail();

            // Get booking items
            $bookingItem1 = $booking1->items->first();
            $bookingItem2 = $booking2->items->first();

            if (!$bookingItem1 || !$bookingItem2) {
                throw new Exception('Booking items not found');
            }

            // Get current assignments
            $assignment1Meta = BookingItemMeta::where('booking_item_id', $bookingItem1->id)
                ->where('meta_key', 'table_assignment')
                ->firstOrFail();

            $assignment2Meta = BookingItemMeta::where('booking_item_id', $bookingItem2->id)
                ->where('meta_key', 'table_assignment')
                ->firstOrFail();

            $assignment1 = json_decode($assignment1Meta->meta_value, true);
            $assignment2 = json_decode($assignment2Meta->meta_value, true);

            // Get occasion ID (both should be same event)
            $occasionMeta1 = BookingMeta::where('booking_id', $booking1->id)
                ->where('meta_key', 'special_occasion_id')
                ->firstOrFail();

            $occasionMeta2 = BookingMeta::where('booking_id', $booking2->id)
                ->where('meta_key', 'special_occasion_id')
                ->firstOrFail();

            if ($occasionMeta1->meta_value !== $occasionMeta2->meta_value) {
                throw new Exception('Cannot swap bookings from different events');
            }

            $occasionId = (int)$occasionMeta1->meta_value;

            // Check if relocation is enabled
            $occasion = SpecialOccasion::find($occasionId);
            if (!$occasion || !$occasion->enable_relocation) {
                throw new Exception('Relocation is not enabled for this event');
            }

            // Get current assignment records
            $assignmentRecord1 = DB::table('special_occasion_table_assignments')
                ->where('booking_id', $request->booking_id_1)
                ->where('is_current', true)
                ->first();

            $assignmentRecord2 = DB::table('special_occasion_table_assignments')
                ->where('booking_id', $request->booking_id_2)
                ->where('is_current', true)
                ->first();

            // Mark both as historical
            if ($assignmentRecord1) {
                DB::table('special_occasion_table_assignments')
                    ->where('id', $assignmentRecord1->id)
                    ->update([
                        'is_current' => false,
                        'status' => 'removed',
                        'replaced_at' => now(),
                        'updated_at' => now()
                    ]);
            }

            if ($assignmentRecord2) {
                DB::table('special_occasion_table_assignments')
                    ->where('id', $assignmentRecord2->id)
                    ->update([
                        'is_current' => false,
                        'status' => 'removed',
                        'replaced_at' => now(),
                        'updated_at' => now()
                    ]);
            }

            // Create swapped assignments
            // Booking 1 gets Booking 2's seat
            $newAssignment1Id = DB::table('special_occasion_table_assignments')->insertGetId([
                'occasion_id' => $occasionId,
                'table_id' => $assignment2['table_id'],
                'table_name' => $assignment2['table_name'],
                'row_number' => $assignment2['row_number'],
                'column_number' => $assignment2['column_number'],
                'assign_number' => $assignment2['assign_number'],
                'booking_id' => $request->booking_id_1,
                'booking_item_id' => $bookingItem1->id,
                'is_current' => true,
                'status' => 'assigned',
                'assigned_at' => now(),
                'created_at' => now(),
                'updated_at' => now()
            ]);

            // Booking 2 gets Booking 1's seat
            $newAssignment2Id = DB::table('special_occasion_table_assignments')->insertGetId([
                'occasion_id' => $occasionId,
                'table_id' => $assignment1['table_id'],
                'table_name' => $assignment1['table_name'],
                'row_number' => $assignment1['row_number'],
                'column_number' => $assignment1['column_number'],
                'assign_number' => $assignment1['assign_number'],
                'booking_id' => $request->booking_id_2,
                'booking_item_id' => $bookingItem2->id,
                'is_current' => true,
                'status' => 'assigned',
                'assigned_at' => now(),
                'created_at' => now(),
                'updated_at' => now()
            ]);

            // Update replaced_by references
            if ($assignmentRecord1) {
                DB::table('special_occasion_table_assignments')
                    ->where('id', $assignmentRecord1->id)
                    ->update(['replaced_by' => $newAssignment1Id]);
            }

            if ($assignmentRecord2) {
                DB::table('special_occasion_table_assignments')
                    ->where('id', $assignmentRecord2->id)
                    ->update(['replaced_by' => $newAssignment2Id]);
            }

            // Update booking item meta for both
            BookingItemMeta::updateOrCreate(
                ['booking_item_id' => $bookingItem1->id, 'meta_key' => 'table_assignment'],
                ['meta_value' => json_encode($assignment2)]
            );

            BookingItemMeta::updateOrCreate(
                ['booking_item_id' => $bookingItem2->id, 'meta_key' => 'table_assignment'],
                ['meta_value' => json_encode($assignment1)]
            );

            DB::table('special_occasion_relocation_history')->insert([
                'id' => DB::raw('gen_random_uuid()'),
                'occasion_id' => $occasionId,
                'booking_id' => $bookingId,
                'assignment_id' => null,
                'old_table_name' => $oldAssignment['table_number'],
                'old_row_number' => $oldAssignment['row_number'] ? (int)$oldAssignment['row_number'] : null,
                'old_column_number' => $oldAssignment['column_number'] ? (int)$oldAssignment['column_number'] : null,
                'old_assign_number' => $oldAssignment['seat_number'],
                'new_table_name' => $newTableNumber,
                'new_row_number' => $request->new_row_number,
                'new_column_number' => $request->new_column_number,
                'new_assign_number' => $newAssignNumber,
                'action_type' => strtoupper($request->change_type),
                'change_reason' => $request->reason,
                'changed_by' => auth()->id(),
                'changed_at' => now()
            ]);

            DB::commit();

            return response()->json([
                'success' => true,
                'message' => 'Bookings swapped successfully',
                'data' => [
                    'booking_1' => [
                        'booking_id' => $request->booking_id_1,
                        'booking_number' => $booking1->booking_number,
                        'old_seat' => $assignment1['assign_number'],
                        'new_seat' => $assignment2['assign_number']
                    ],
                    'booking_2' => [
                        'booking_id' => $request->booking_id_2,
                        'booking_number' => $booking2->booking_number,
                        'old_seat' => $assignment2['assign_number'],
                        'new_seat' => $assignment1['assign_number']
                    ],
                    'swapped_at' => now()->toISOString()
                ]
            ], 200);
        } catch (Exception $e) {
            DB::rollBack();
            Log::error('Error swapping bookings', [
                'booking_id_1' => $request->booking_id_1 ?? null,
                'booking_id_2' => $request->booking_id_2 ?? null,
                'error' => $e->getMessage(),
                'trace' => $e->getTraceAsString()
            ]);

            return response()->json([
                'success' => false,
                'message' => 'Failed to swap bookings',
                'error' => $e->getMessage()
            ], 500);
        }
    }


/**
 * Get relocation log report (STEP 3.2)
 */
public function getRelocationLog(Request $request)
{
    try {
        $query = DB::table('special_occasion_relocation_history as rh')
            ->leftJoin('special_occ_master as som', 'rh.occasion_id', '=', 'som.id')
            ->leftJoin('bookings as b', 'rh.booking_id', '=', 'b.id')
            ->leftJoin('users as u', 'rh.changed_by', '=', 'u.id')
            ->select([
                'rh.id',
                'rh.occasion_id',
                'som.occasion_name_primary as event_name',
                'rh.booking_id',
                'b.booking_number',
                'rh.old_table_name',
                'rh.old_row_number',
                'rh.old_column_number',
                'rh.old_assign_number',
                'rh.new_table_name',
                'rh.new_row_number',
                'rh.new_column_number',
                'rh.new_assign_number',
                'rh.action_type',
                'rh.change_reason',
                'rh.changed_by',
                // ✅ FIXED: Use username or name instead of first_name/last_name
                DB::raw("COALESCE(u.username, u.name, CAST(u.id AS VARCHAR)) as changed_by_name"),
                'rh.changed_at'
            ])
            ->orderBy('rh.changed_at', 'desc');

        // Filter by event
        if ($request->filled('occasion_id')) {
            $query->where('rh.occasion_id', $request->occasion_id);
        }

        // Filter by date range
        if ($request->filled('start_date')) {
            $query->whereDate('rh.changed_at', '>=', $request->start_date);
        }

        if ($request->filled('end_date')) {
            $query->whereDate('rh.changed_at', '<=', $request->end_date);
        }

        // Filter by admin user
        if ($request->filled('changed_by')) {
            $query->where('rh.changed_by', $request->changed_by);
        }

        // Filter by change type
        if ($request->filled('action_type')) {
            $query->where('rh.action_type', $request->action_type);
        }

        // Filter by booking number
        if ($request->filled('booking_number')) {
            $query->where('b.booking_number', 'ILIKE', '%' . $request->booking_number . '%');
        }

        // Pagination
        $perPage = $request->get('per_page', 50);
        $results = $query->paginate($perPage);

        return response()->json([
            'success' => true,
            'data' => $results->items(),
            'pagination' => [
                'total' => $results->total(),
                'per_page' => $results->perPage(),
                'current_page' => $results->currentPage(),
                'last_page' => $results->lastPage(),
                'from' => $results->firstItem(),
                'to' => $results->lastItem()
            ]
        ], 200);
    } catch (Exception $e) {
        Log::error('Error fetching relocation log', [
            'error' => $e->getMessage(),
            'trace' => $e->getTraceAsString()
        ]);

        return response()->json([
            'success' => false,
            'message' => 'Failed to fetch relocation log',
            'error' => config('app.debug') ? $e->getMessage() : 'An error occurred'
        ], 500);
    }
}

    // ========================================================================
    // RELOCATION HELPER METHODS
    // ========================================================================

    /**
     * Find a booking that conflicts with the proposed new assignment
     */
    private function findConflictingBooking($occasionId, $eventDate, $tableNumber, $seatNumber, $excludeBookingId)
    {
        return Booking::where('booking_type', 'SPECIAL_OCCASIONS')
            ->where('booking_status', '!=', 'cancelled')
            ->where('id', '!=', $excludeBookingId)
            ->whereHas('meta', function ($q) use ($occasionId) {
                $q->where('meta_key', 'occasion_id')
                    ->where('meta_value', $occasionId);
            })
            ->whereHas('meta', function ($q) use ($eventDate) {
                $q->where('meta_key', 'event_date')
                    ->where('meta_value', $eventDate);
            })
            ->whereHas('meta', function ($q) use ($tableNumber) {
                $q->where('meta_key', 'table_number')
                    ->where('meta_value', $tableNumber);
            })
            ->whereHas('meta', function ($q) use ($seatNumber) {
                $q->where('meta_key', 'seat_number')
                    ->where('meta_value', $seatNumber);
            })
            ->first();
    }

    /**
     * Get devotee name from booking
     */
    private function getDevoteeName($booking)
    {
        $nameEnglish = $booking->meta->where('meta_key', 'name_english')->first();
        $nameChinese = $booking->meta->where('meta_key', 'name_chinese')->first();

        return ($nameEnglish ? $nameEnglish->meta_value : '') .
            ($nameChinese ? ' (' . $nameChinese->meta_value . ')' : '');
    }

    /**
     * Get current assignment from booking
     */
    private function getAssignment($booking)
    {
        $assignment = [
            'table_number' => null,
            'row_number' => null,
            'column_number' => null,
            'seat_number' => null,
        ];

        foreach ($booking->meta as $meta) {
            if (array_key_exists($meta->meta_key, $assignment)) {
                $assignment[$meta->meta_key] = $meta->meta_value;
            }
        }

        return $assignment;
    }

    /**
     * Get occasion ID from booking
     */
    private function getOccasionIdFromBooking($booking)
    {
        $mainItem = $booking->items->where('add_ons', 0)->first();
        if ($mainItem) {
            // First try to get occasion_id directly
            $occasionMeta = $mainItem->meta->where('meta_key', 'occasion_id')->first();
            if ($occasionMeta) {
                return $occasionMeta->meta_value;
            }

            // If not found, look up from option_id via occasion_options table
            $optionMeta = $mainItem->meta->where('meta_key', 'option_id')->first();
            if ($optionMeta) {
                $optionData = DB::table('occasion_options')
                    ->where('id', $optionMeta->meta_value)
                    ->select('occasion_id')
                    ->first();

                if ($optionData) {
                    return $optionData->occasion_id;
                }
            }
        }
        return null;
    }

    /**
     * Get event date from booking
     */
    private function getEventDateFromBooking($booking)
    {
        $mainItem = $booking->items->where('add_ons', 0)->first();
        if ($mainItem) {
            $eventDateMeta = $mainItem->meta->where('meta_key', 'event_date')->first();
            return $eventDateMeta ? $eventDateMeta->meta_value : null;
        }
        return null;
    }

    /**
     * Create relocation log entry (STEP 3.1)
     */
    private function createRelocationLog($data)
    {
        DB::table('booking_relocation_logs')->insert([
            'booking_id' => $data['booking_id'],
            'occasion_id' => $data['occasion_id'],
            'event_date' => $data['event_date'],
            'old_table_number' => $data['old_table'],
            'old_row_number' => $data['old_row'],
            'old_column_number' => $data['old_column'],
            'old_seat_number' => $data['old_seat'],
            'new_table_number' => $data['new_table'],
            'new_row_number' => $data['new_row'],
            'new_column_number' => $data['new_column'],
            'new_seat_number' => $data['new_seat'],
            'change_type' => $data['change_type'],
            'reason' => $data['reason'],
            'changed_by' => $data['changed_by'],
            'affected_booking_id' => $data['affected_booking_id'] ?? null,
            'created_at' => now(),
            'updated_at' => now(),
        ]);
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
}
