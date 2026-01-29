<?php

namespace App\Http\Controllers;

use App\Models\LightLayoutConfig;
use App\Models\LightLayoutRow;
use App\Models\LightUnit;
use App\Models\LightBooking;
use App\Traits\ApiResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Validator;
use Illuminate\Support\Facades\DB;

class LightBookingController extends Controller
{
    use ApiResponse;

    /**
     * Get seat map for a configuration (Cinema Style)
     * GET /api/v1/light-bookings/seat-map/{configId}
     */
    public function getSeatMap(Request $request, $configId)
    {
        try {
            $temple = $request->input('current_temple');
            
            $config = LightLayoutConfig::forTemple($temple['id'])
                ->where('config_id', $configId)
                ->with(['floor', 'deity'])
                ->first();

            if (!$config) {
                return $this->errorResponse('Configuration not found', 404);
            }

            // Get rows ordered
            $rows = LightLayoutRow::where('config_id', $configId)
                ->ordered()
                ->get();

            // Get all units grouped by row
            $units = LightUnit::where('config_id', $configId)
                ->orderBy('row_no')
                ->orderBy('col_no')
                ->get()
                ->groupBy('row_no');

            // Build seat map data
            $seatMap = [];
            foreach ($rows as $row) {
                $rowUnits = $units->get($row->row_no, collect());
                
                $seatMap[] = [
                    'row_no' => $row->row_no,
                    'row_label' => $row->row_label,
                    'column_count' => $row->column_count,
                    'meaning' => $row->meaning,
                    'price' => $row->price,
                    'units' => $rowUnits->map(function ($unit) {
                        return [
                            'unit_id' => $unit->unit_id,
                            'col_no' => $unit->col_no,
                            'unit_code' => $unit->unit_code,
                            'status' => $unit->status,
                            'remark' => $unit->remark
                        ];
                    })->values()
                ];
            }

            // Get statistics
            $stats = [
                'total_units' => $config->units()->count(),
                'available' => $config->units()->where('status', 'AVAILABLE')->count(),
                'booked' => $config->units()->where('status', 'BOOKED')->count(),
                'reserved' => $config->units()->where('status', 'RESERVED')->count(),
                'maintenance' => $config->units()->where('status', 'MAINTENANCE')->count(),
                'disabled' => $config->units()->where('status', 'DISABLED')->count()
            ];

            return $this->successResponse([
                'config' => $config,
                'seat_map' => $seatMap,
                'statistics' => $stats
            ], 'Seat map retrieved successfully');
        } catch (\Exception $e) {
            return $this->errorResponse('Failed to retrieve seat map: ' . $e->getMessage(), 500);
        }
    }

    /**
     * Reserve a light unit (with concurrency control)
     * POST /api/v1/light-bookings/reserve
     */
    public function reserve(Request $request)
    {
        try {
            $temple = $request->input('current_temple');
            
            $validator = Validator::make($request->all(), [
                'unit_id' => 'required|exists:light_unit,unit_id',
                'devotee_name' => 'required|string|max:200',
                'devotee_nric' => 'nullable|string|max:50',
                'devotee_phone' => 'required|string|max:20',
                'devotee_email' => 'nullable|email|max:100',
                'offering_date_from' => 'required|date',
                'offering_date_to' => 'required|date|after_or_equal:offering_date_from',
                'amount' => 'required|numeric|min:0'
            ]);

            if ($validator->fails()) {
                return $this->errorResponse($validator->errors()->first(), 422);
            }

            DB::beginTransaction();
            try {
                // Lock and check unit availability (CRITICAL for concurrency)
                $unit = LightUnit::where('unit_id', $request->unit_id)
                    ->where('status', 'AVAILABLE')
                    ->lockForUpdate()
                    ->first();

                if (!$unit) {
                    DB::rollBack();
                    return $this->errorResponse('This light is no longer available. Please select another.', 400);
                }

                // Get config for temple verification
                $config = LightLayoutConfig::where('config_id', $unit->config_id)
                    ->forTemple($temple['id'])
                    ->first();

                if (!$config) {
                    DB::rollBack();
                    return $this->errorResponse('Invalid configuration', 400);
                }

                // Calculate duration
                $dateFrom = \Carbon\Carbon::parse($request->offering_date_from);
                $dateTo = \Carbon\Carbon::parse($request->offering_date_to);
                $durationDays = $dateTo->diffInDays($dateFrom) + 1;

                // Create booking
                $booking = LightBooking::create([
                    'temple_id' => $temple['id'],
                    'config_id' => $unit->config_id,
                    'unit_id' => $unit->unit_id,
                    'devotee_name' => $request->devotee_name,
                    'devotee_nric' => $request->devotee_nric,
                    'devotee_phone' => $request->devotee_phone,
                    'devotee_email' => $request->devotee_email,
                    'offering_date_from' => $request->offering_date_from,
                    'offering_date_to' => $request->offering_date_to,
                    'duration_days' => $durationDays,
                    'amount' => $request->amount,
                    'status' => 'RESERVED',
                    'payment_status' => 'PENDING',
                    'reserved_until' => now()->addMinutes(10),
                    'created_by' => auth()->id() ?? null
                ]);

                // Update unit status
                $unit->update(['status' => 'RESERVED']);

                DB::commit();

                $booking->load(['config', 'unit']);

                return $this->successResponse([
                    'booking' => $booking,
                    'reserved_until' => $booking->reserved_until,
                    'expires_in_minutes' => 10
                ], 'Light reserved successfully. Please complete payment within 10 minutes.');
            } catch (\Exception $e) {
                DB::rollBack();
                throw $e;
            }
        } catch (\Exception $e) {
            return $this->errorResponse('Failed to reserve light: ' . $e->getMessage(), 500);
        }
    }

    /**
     * Confirm booking and payment
     * POST /api/v1/light-bookings/{id}/confirm
     */
    public function confirm(Request $request, $id)
    {
        try {
            $temple = $request->input('current_temple');
            
            $booking = LightBooking::forTemple($temple['id'])
                ->where('booking_id', $id)
                ->first();

            if (!$booking) {
                return $this->errorResponse('Booking not found', 404);
            }

            if ($booking->status !== 'RESERVED') {
                return $this->errorResponse('Booking is not in reserved status', 400);
            }

            // Check if reservation expired
            if ($booking->isReservationExpired()) {
                return $this->errorResponse('Reservation has expired. Please book again.', 400);
            }

            $validator = Validator::make($request->all(), [
                'payment_mode' => 'required|string|max:50',
                'payment_reference' => 'nullable|string|max:100'
            ]);

            if ($validator->fails()) {
                return $this->errorResponse($validator->errors()->first(), 422);
            }

            DB::beginTransaction();
            try {
                // Update booking
                $booking->update([
                    'status' => 'ACTIVE',
                    'payment_status' => 'PAID',
                    'payment_date' => now(),
                    'payment_mode' => $request->payment_mode,
                    'payment_reference' => $request->payment_reference,
                    'updated_by' => auth()->id() ?? null
                ]);

                // Update unit status
                LightUnit::where('unit_id', $booking->unit_id)
                    ->update(['status' => 'BOOKED']);

                DB::commit();

                $booking->load(['config', 'unit']);

                return $this->successResponse($booking, 'Booking confirmed successfully');
            } catch (\Exception $e) {
                DB::rollBack();
                throw $e;
            }
        } catch (\Exception $e) {
            return $this->errorResponse('Failed to confirm booking: ' . $e->getMessage(), 500);
        }
    }

    /**
     * Get user's bookings
     * GET /api/v1/light-bookings/my-bookings
     */
    public function myBookings(Request $request)
    {
        try {
            $temple = $request->input('current_temple');
            $userId = auth()->id();

            if (!$userId) {
                return $this->errorResponse('Unauthorized', 401);
            }

            $bookings = LightBooking::forTemple($temple['id'])
                ->where('created_by', $userId)
                ->with(['config.floor', 'config.deity', 'unit'])
                ->orderBy('created_at', 'desc')
                ->get();

            return $this->successResponse($bookings, 'Bookings retrieved successfully');
        } catch (\Exception $e) {
            return $this->errorResponse('Failed to retrieve bookings: ' . $e->getMessage(), 500);
        }
    }

    /**
     * Get all bookings (Admin)
     * GET /api/v1/light-bookings
     */
    public function index(Request $request)
    {
        try {
            $temple = $request->input('current_temple');
            
            $query = LightBooking::forTemple($temple['id'])
                ->with(['config.floor', 'config.deity', 'unit']);

            // Filter by status
            if ($request->has('status')) {
                $query->where('status', $request->status);
            }

            // Filter by config
            if ($request->has('config_id')) {
                $query->where('config_id', $request->config_id);
            }

            // Filter by date range
            if ($request->has('date_from')) {
                $query->whereDate('created_at', '>=', $request->date_from);
            }
            if ($request->has('date_to')) {
                $query->whereDate('created_at', '<=', $request->date_to);
            }

            $bookings = $query->orderBy('created_at', 'desc')
                ->paginate($request->per_page ?? 20);

            return $this->successResponse($bookings, 'Bookings retrieved successfully');
        } catch (\Exception $e) {
            return $this->errorResponse('Failed to retrieve bookings: ' . $e->getMessage(), 500);
        }
    }

    /**
     * Cancel a booking
     * POST /api/v1/light-bookings/{id}/cancel
     */
    public function cancel(Request $request, $id)
    {
        try {
            $temple = $request->input('current_temple');
            
            $booking = LightBooking::forTemple($temple['id'])
                ->where('booking_id', $id)
                ->first();

            if (!$booking) {
                return $this->errorResponse('Booking not found', 404);
            }

            if (!in_array($booking->status, ['RESERVED', 'ACTIVE'])) {
                return $this->errorResponse('Cannot cancel this booking', 400);
            }

            $validator = Validator::make($request->all(), [
                'cancellation_reason' => 'nullable|string'
            ]);

            if ($validator->fails()) {
                return $this->errorResponse($validator->errors()->first(), 422);
            }

            DB::beginTransaction();
            try {
                // Cancel booking
                $booking->cancel(
                    $request->cancellation_reason,
                    auth()->id()
                );

                // Release unit
                LightUnit::where('unit_id', $booking->unit_id)
                    ->update(['status' => 'AVAILABLE']);

                DB::commit();

                return $this->successResponse($booking, 'Booking cancelled successfully');
            } catch (\Exception $e) {
                DB::rollBack();
                throw $e;
            }
        } catch (\Exception $e) {
            return $this->errorResponse('Failed to cancel booking: ' . $e->getMessage(), 500);
        }
    }

    /**
     * Release expired reservations (Cron job)
     * POST /api/v1/light-bookings/release-expired
     */
    public function releaseExpired(Request $request)
    {
        try {
            $temple = $request->input('current_temple');
            
            $expiredBookings = LightBooking::forTemple($temple['id'])
                ->expiredReservations()
                ->get();

            $releasedCount = 0;

            DB::beginTransaction();
            try {
                foreach ($expiredBookings as $booking) {
                    // Mark booking as expired
                    $booking->markAsExpired();

                    // Release unit
                    LightUnit::where('unit_id', $booking->unit_id)
                        ->update(['status' => 'AVAILABLE']);

                    $releasedCount++;
                }

                DB::commit();

                return $this->successResponse([
                    'released_count' => $releasedCount
                ], "$releasedCount expired reservations released");
            } catch (\Exception $e) {
                DB::rollBack();
                throw $e;
            }
        } catch (\Exception $e) {
            return $this->errorResponse('Failed to release expired reservations: ' . $e->getMessage(), 500);
        }
    }
}
