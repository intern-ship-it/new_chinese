<?php

namespace App\Http\Controllers;

use App\Models\SpecialOccasionBooking;
use App\Models\SpecialOccasion;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Log;
use Illuminate\Support\Facades\Validator;
use Exception;

class SpecialOccasionBookingController extends Controller
{
    /**
     * Get all bookings with filters
     */
    public function index(Request $request)
    {
        try {
            $query = DB::table('special_occasion_bookings');

            // Filter by status
            if ($request->filled('status')) {
                $query->where('status', $request->status);
            }

            // Filter by date range
            if ($request->filled('from_date')) {
                $query->whereDate('event_date', '>=', $request->from_date);
            }
            if ($request->filled('to_date')) {
                $query->whereDate('event_date', '<=', $request->to_date);
            }

            // Filter by occasion
            if ($request->filled('occasion_id')) {
                $query->where('special_occasion_id', $request->occasion_id);
            }

            // Search
            if ($request->filled('search')) {
                $search = $request->search;
                $query->where(function ($q) use ($search) {
                    $q->where('name_chinese', 'ILIKE', "%{$search}%")
                      ->orWhere('name_english', 'ILIKE', "%{$search}%")
                      ->orWhere('booking_code', 'ILIKE', "%{$search}%")
                      ->orWhere('contact_no', 'ILIKE', "%{$search}%");
                });
            }

            $bookings = $query->orderBy('created_at', 'desc')->get();

            return response()->json([
                'success' => true,
                'data' => $bookings,
                'count' => $bookings->count()
            ], 200);

        } catch (Exception $e) {
            Log::error('Error fetching bookings: ' . $e->getMessage());
            return response()->json([
                'success' => false,
                'message' => 'Failed to fetch bookings',
                'error' => $e->getMessage()
            ], 500);
        }
    }

    /**
     * Get single booking
     */
    public function show($id)
    {
        try {
            $booking = DB::table('special_occasion_bookings')->find($id);

            if (!$booking) {
                return response()->json([
                    'success' => false,
                    'message' => 'Booking not found'
                ], 404);
            }

            return response()->json([
                'success' => true,
                'data' => $booking
            ], 200);

        } catch (Exception $e) {
            Log::error('Error fetching booking: ' . $e->getMessage());
            return response()->json([
                'success' => false,
                'message' => 'Failed to fetch booking',
                'error' => $e->getMessage()
            ], 500);
        }
    }

    /**
     * Create new booking
     */
    public function store(Request $request)
    {
        try {
            $validator = Validator::make($request->all(), [
                'special_occasion_id' => 'required|integer',
                'option_id' => 'required|integer',
                'slot_id' => 'nullable|integer',
                'event_date' => 'required|date',
                'name_chinese' => 'required|string|max:255',
                'name_english' => 'required|string|max:255',
                'nric' => 'required|string|max:50',
                'email' => 'required|email|max:255',
                'contact_no' => 'required|string|max:50',
                'payment_methods' => 'required|string',
                'remark' => 'nullable|string'
            ]);

            if ($validator->fails()) {
                return response()->json([
                    'success' => false,
                    'message' => 'Validation error',
                    'errors' => $validator->errors()
                ], 422);
            }

            // Get option details for amount and ledger
            $option = DB::table('occasion_options')->find($request->option_id);
            if (!$option) {
                return response()->json([
                    'success' => false,
                    'message' => 'Invalid package selected'
                ], 422);
            }

            // Get occasion details
            $occasion = DB::table('special_occ_master')->find($request->special_occasion_id);

            // Check slot availability if slot is selected
            if ($request->slot_id) {
                $slot = DB::table('occasion_option_time_slots')->find($request->slot_id);
                if ($slot && $option->package_mode === 'multiple') {
                    // Check capacity
                    $existingBookings = DB::table('special_occasion_bookings')
                        ->where('slot_id', $request->slot_id)
                        ->where('event_date', $request->event_date)
                        ->whereNotIn('status', ['cancelled'])
                        ->count();
                    
                    $capacity = $slot->capacity ?? $option->slot_capacity ?? 999;
                    if ($existingBookings >= $capacity) {
                        return response()->json([
                            'success' => false,
                            'message' => 'This time slot is fully booked for the selected date'
                        ], 422);
                    }
                } elseif ($option->package_mode === 'single') {
                    // Single mode - check if slot already booked
                    $existingBooking = DB::table('special_occasion_bookings')
                        ->where('slot_id', $request->slot_id)
                        ->where('event_date', $request->event_date)
                        ->whereNotIn('status', ['cancelled'])
                        ->exists();
                    
                    if ($existingBooking) {
                        return response()->json([
                            'success' => false,
                            'message' => 'This time slot is already booked for the selected date'
                        ], 422);
                    }
                }
            }

            DB::beginTransaction();

            // Generate booking code
            $bookingCode = $this->generateBookingCode();

            // Create booking
            $bookingId = DB::table('special_occasion_bookings')->insertGetId([
                'booking_code' => $bookingCode,
                'special_occasion_id' => $request->special_occasion_id,
                'option_id' => $request->option_id,
                'slot_id' => $request->slot_id,
                'event_date' => $request->event_date,
                'occasion_name' => $occasion->occasion_name_primary ?? '',
                'occasion_option' => $option->name,
                'occasion_amount' => $option->amount,
                'amount_paid' => $option->amount,
                'ledger_id' => $option->ledger_id,
                'name_chinese' => $request->name_chinese,
                'name_english' => $request->name_english,
                'nric' => $request->nric,
                'email' => $request->email,
                'contact_no' => $request->contact_no,
                'payment_methods' => $request->payment_methods,
                'remark' => $request->remark,
                'status' => 'confirmed',
                'booking_date' => now(),
                'created_at' => now(),
                'updated_at' => now()
            ]);

            // Generate receipt number
            $receiptNumber = 'RCP' . date('Ymd') . str_pad($bookingId, 5, '0', STR_PAD_LEFT);
            DB::table('special_occasion_bookings')
                ->where('id', $bookingId)
                ->update(['receipt_number' => $receiptNumber]);

            DB::commit();

            // Get the created booking
            $booking = DB::table('special_occasion_bookings')->find($bookingId);

            return response()->json([
                'success' => true,
                'message' => 'Booking created successfully',
                'data' => $booking
            ], 201);

        } catch (Exception $e) {
            DB::rollBack();
            Log::error('Error creating booking: ' . $e->getMessage());
            Log::error('Stack trace: ' . $e->getTraceAsString());
            return response()->json([
                'success' => false,
                'message' => 'Failed to create booking',
                'error' => $e->getMessage()
            ], 500);
        }
    }

    /**
     * Update booking status
     */
    public function updateStatus(Request $request, $id)
    {
        try {
            $booking = DB::table('special_occasion_bookings')->find($id);

            if (!$booking) {
                return response()->json([
                    'success' => false,
                    'message' => 'Booking not found'
                ], 404);
            }

            $validator = Validator::make($request->all(), [
                'status' => 'required|in:pending,confirmed,completed,cancelled'
            ]);

            if ($validator->fails()) {
                return response()->json([
                    'success' => false,
                    'message' => 'Invalid status'
                ], 422);
            }

            $oldStatus = $booking->status;
            
            $updateData = [
                'status' => $request->status,
                'updated_at' => now()
            ];

            // If cancelling, record cancellation details
            if ($request->status === 'cancelled') {
                $updateData['cancelled_at'] = now();
                $updateData['cancelled_by'] = auth()->id();
                $updateData['cancellation_reason'] = $request->reason ?? null;
            }

            DB::table('special_occasion_bookings')
                ->where('id', $id)
                ->update($updateData);

            return response()->json([
                'success' => true,
                'message' => "Booking status updated from {$oldStatus} to {$request->status}"
            ], 200);

        } catch (Exception $e) {
            Log::error('Error updating booking status: ' . $e->getMessage());
            return response()->json([
                'success' => false,
                'message' => 'Failed to update status',
                'error' => $e->getMessage()
            ], 500);
        }
    }

    /**
     * Delete booking
     */
    public function destroy($id)
    {
        try {
            $booking = DB::table('special_occasion_bookings')->find($id);

            if (!$booking) {
                return response()->json([
                    'success' => false,
                    'message' => 'Booking not found'
                ], 404);
            }

            // Soft delete - just mark as cancelled
            DB::table('special_occasion_bookings')
                ->where('id', $id)
                ->update([
                    'status' => 'cancelled',
                    'cancelled_at' => now(),
                    'updated_at' => now()
                ]);

            return response()->json([
                'success' => true,
                'message' => 'Booking cancelled successfully'
            ], 200);

        } catch (Exception $e) {
            Log::error('Error deleting booking: ' . $e->getMessage());
            return response()->json([
                'success' => false,
                'message' => 'Failed to delete booking',
                'error' => $e->getMessage()
            ], 500);
        }
    }

    /**
     * Get available slots for a package and date
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

            $option = DB::table('occasion_options')->find($request->option_id);
            
            if (!$option) {
                return response()->json([
                    'success' => false,
                    'message' => 'Package not found'
                ], 404);
            }

            // Get time slots for this option
            $timeSlots = DB::table('occasion_option_time_slots')
                ->where('option_id', $request->option_id)
                ->where('status', 'active')
                ->orderBy('sort_order')
                ->orderBy('start_time')
                ->get();

            $slots = [];
            foreach ($timeSlots as $slot) {
                // Count existing bookings for this slot on this date
                $bookedCount = DB::table('special_occasion_bookings')
                    ->where('slot_id', $slot->id)
                    ->where('event_date', $request->event_date)
                    ->whereNotIn('status', ['cancelled'])
                    ->count();

                $capacity = $slot->capacity ?? $option->slot_capacity ?? 999;
                $available = $capacity - $bookedCount;

                $slots[] = [
                    'id' => $slot->id,
                    'slot_name' => $slot->slot_name,
                    'slot_name_secondary' => $slot->slot_name_secondary,
                    'start_time' => $slot->start_time,
                    'end_time' => $slot->end_time,
                    'capacity' => $capacity,
                    'booked' => $bookedCount,
                    'available' => max(0, $available),
                    'is_available' => $option->package_mode === 'single' 
                        ? ($bookedCount == 0) 
                        : ($available > 0)
                ];
            }

            return response()->json([
                'success' => true,
                'data' => $slots,
                'package_mode' => $option->package_mode
            ], 200);

        } catch (Exception $e) {
            Log::error('Error fetching slots: ' . $e->getMessage());
            Log::error('Stack trace: ' . $e->getTraceAsString());
            return response()->json([
                'success' => false,
                'message' => 'Failed to fetch slots',
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
            $option = DB::table('occasion_options')->find($optionId);
            
            if (!$option) {
                return response()->json([
                    'success' => false,
                    'message' => 'Package not found'
                ], 404);
            }

            $dates = [];
            
            if ($option->date_type === 'multiple_dates') {
                // Return predefined dates from occasion_option_dates table
                $dbDates = DB::table('occasion_option_dates')
                    ->where('option_id', $optionId)
                    ->where('status', 'active')
                    ->where('event_date', '>=', now()->toDateString())
                    ->orderBy('event_date')
                    ->get();

                foreach ($dbDates as $date) {
                    $dates[] = [
                        'date' => $date->event_date,
                        'description' => $date->description
                    ];
                }
            } else {
                // Return date range
                $dates = [
                    'type' => 'range',
                    'start' => $option->date_range_start,
                    'end' => $option->date_range_end
                ];
            }

            return response()->json([
                'success' => true,
                'date_type' => $option->date_type,
                'data' => $dates
            ], 200);

        } catch (Exception $e) {
            Log::error('Error fetching dates: ' . $e->getMessage());
            Log::error('Stack trace: ' . $e->getTraceAsString());
            return response()->json([
                'success' => false,
                'message' => 'Failed to fetch dates',
                'error' => $e->getMessage()
            ], 500);
        }
    }

    /**
     * Generate unique booking code
     */
    private function generateBookingCode()
    {
        $date = date('Ymd');
        $lastBooking = DB::table('special_occasion_bookings')
            ->whereDate('created_at', today())
            ->orderBy('id', 'desc')
            ->first();

        $sequence = 1;
        if ($lastBooking && $lastBooking->booking_code) {
            $lastSequence = (int) substr($lastBooking->booking_code, -4);
            $sequence = $lastSequence + 1;
        }

        return 'SO' . $date . str_pad($sequence, 4, '0', STR_PAD_LEFT);
    }
}