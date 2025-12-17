<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Models\Event;
use App\Models\Booking;
use App\Models\BookingItem;
use App\Models\BookingItemMeta;
use App\Models\BookingPayment;
use App\Models\PaymentMode;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Validator;
use Illuminate\Support\Str;
use Carbon\Carbon;

class EventBookingController extends Controller
{
    /**
     * Get available events for booking
     */
    public function getAvailableEvents()
    {
        try {
            $events = Event::active()
                ->where('to_date', '>=', now()->toDateString())
                ->orderBy('from_date', 'asc')
                ->get()
                ->map(function ($event) {
                    return [
                        'id' => $event->id,
                        'event_name_primary' => $event->event_name_primary,
                        'event_name_secondary' => $event->event_name_secondary,
                        'from_date' => $event->from_date->format('Y-m-d'),
                        'to_date' => $event->to_date->format('Y-m-d'),
                        'description_primary' => $event->description_primary,
                        'description_secondary' => $event->description_secondary,
                        'price' => (float) $event->price,
                        'special_price' => $event->special_price ? (float) $event->special_price : null,
                        'effective_price' => (float) $event->effective_price,
                        'max_booking_count' => $event->max_booking_count,
                        'max_booking_per_day' => $event->max_booking_per_day,
                        'remaining_slots' => $event->getRemainingSlots(),
                        'available_dates' => $event->available_dates,
                        'duration_days' => $event->duration_days,
                    ];
                });

            return response()->json([
                'success' => true,
                'data' => $events
            ]);
        } catch (\Exception $e) {
            return response()->json([
                'success' => false,
                'message' => 'Failed to fetch events: ' . $e->getMessage()
            ], 500);
        }
    }

    /**
     * Get event details with available dates
     */
    public function getEventDetails($id)
    {
        try {
            $event = Event::findOrFail($id);
            
            $availableDates = [];
            $start = Carbon::parse($event->from_date);
            $end = Carbon::parse($event->to_date);
            $today = now()->startOfDay();

            while ($start <= $end) {
                if ($start >= $today) {
                    $date = $start->format('Y-m-d');
                    $bookingCount = $event->getBookingCountForDate($date);
                    $isAvailable = $event->isDateAvailable($date);
                    
                    $availableDates[] = [
                        'date' => $date,
                        'day_name' => $start->format('l'),
                        'formatted' => $start->format('d M Y'),
                        'booking_count' => $bookingCount,
                        'is_available' => $isAvailable,
                        'remaining' => $event->max_booking_per_day 
                            ? max(0, $event->max_booking_per_day - $bookingCount) 
                            : null
                    ];
                }
                $start->addDay();
            }

            return response()->json([
                'success' => true,
                'data' => [
                    'id' => $event->id,
                    'event_name_primary' => $event->event_name_primary,
                    'event_name_secondary' => $event->event_name_secondary,
                    'from_date' => $event->from_date->format('Y-m-d'),
                    'to_date' => $event->to_date->format('Y-m-d'),
                    'description_primary' => $event->description_primary,
                    'description_secondary' => $event->description_secondary,
                    'price' => (float) $event->price,
                    'special_price' => $event->special_price ? (float) $event->special_price : null,
                    'effective_price' => (float) $event->effective_price,
                    'max_booking_count' => $event->max_booking_count,
                    'max_booking_per_day' => $event->max_booking_per_day,
                    'remaining_slots' => $event->getRemainingSlots(),
                    'available_dates' => $availableDates,
                ]
            ]);
        } catch (\Exception $e) {
            return response()->json([
                'success' => false,
                'message' => 'Failed to fetch event details: ' . $e->getMessage()
            ], 500);
        }
    }

    /**
     * Get payment modes
     */
    public function getPaymentModes()
    {
        try {
            $paymentModes = PaymentMode::where('status', 1)
                ->orderBy('name', 'asc')
                ->get()
                ->map(function ($mode) {
                    return [
                        'id' => $mode->id,
                        'name' => $mode->name,
                        'description' => $mode->description,
                        'is_payment_gateway' => (bool) $mode->is_payment_gateway,
                        'icon_type' => $mode->icon_type,
                        'icon_value' => $mode->icon_value,
                    ];
                });

            return response()->json([
                'success' => true,
                'data' => $paymentModes
            ]);
        } catch (\Exception $e) {
            return response()->json([
                'success' => false,
                'message' => 'Failed to fetch payment modes: ' . $e->getMessage()
            ], 500);
        }
    }

    /**
     * Create event booking
     */
    public function store(Request $request)
    {
        $validator = Validator::make($request->all(), [
            'event_id' => 'required|exists:events,id',
            'selected_dates' => 'required|array|min:1',
            'selected_dates.*' => 'date',
            'participants' => 'required|array|min:1',
            'participants.*.name' => 'required|string|max:255',
            'participants.*.phone' => 'nullable|string|max:20',
            'participants.*.email' => 'nullable|email|max:255',
            'extra_charges' => 'nullable|array',
            'extra_charges.*.name' => 'required_with:extra_charges|string|max:255',
            'extra_charges.*.amount' => 'required_with:extra_charges|numeric|min:0',
            'discount_amount' => 'nullable|numeric|min:0',
            'discount_reason' => 'nullable|string|max:255',
            'payment_mode_id' => 'required|exists:payment_modes,id',
            'payment_type' => 'required|in:FULL,PARTIAL',
            'paid_amount' => 'required_if:payment_type,PARTIAL|numeric|min:0',
            'notes' => 'nullable|string',
        ]);

        if ($validator->fails()) {
            return response()->json([
                'success' => false,
                'message' => 'Validation failed',
                'errors' => $validator->errors()
            ], 422);
        }

        // Validate primary participant has phone
        $participants = $request->participants;
        if (empty($participants[0]['phone'])) {
            return response()->json([
                'success' => false,
                'message' => 'Primary participant phone number is required'
            ], 422);
        }

        DB::beginTransaction();
        try {
            $event = Event::findOrFail($request->event_id);
            $selectedDates = $request->selected_dates;
            $extraCharges = $request->extra_charges ?? [];
            $discountAmount = $request->discount_amount ?? 0;

            // Validate dates are within event range and available
            foreach ($selectedDates as $date) {
                $dateObj = Carbon::parse($date);
                if ($dateObj < $event->from_date || $dateObj > $event->to_date) {
                    throw new \Exception("Date {$date} is outside event range");
                }
                if (!$event->isDateAvailable($date)) {
                    throw new \Exception("Date {$date} is fully booked");
                }
            }

            // Calculate totals
            $numDays = count($selectedDates);
            $numParticipants = count($participants);
            $eventPrice = (float) $event->effective_price;
            
            $subtotal = $numDays * $numParticipants * $eventPrice;
            $extraChargesTotal = array_sum(array_column($extraCharges, 'amount'));
            $totalAmount = $subtotal + $extraChargesTotal - $discountAmount;
            
            $paidAmount = $request->payment_type === 'FULL' 
                ? $totalAmount 
                : (float) $request->paid_amount;

            // Generate booking number
            $bookingNumber = $this->generateBookingNumber();

            // Create booking
            $booking = Booking::create([
                'booking_number' => $bookingNumber,
                'devotee_id' => auth()->id(),
                'booking_date' => now(),
                'booking_status' => 'BOOKED',
                'payment_status' => $paidAmount >= $totalAmount ? 'PAID' : 'PARTIAL',
                'subtotal' => $subtotal,
                'tax_amount' => 0,
                'discount_amount' => $discountAmount,
                'total_amount' => $totalAmount,
                'paid_amount' => $paidAmount,
                'special_instructions' => $request->notes,
                'created_by' => auth()->id(),
            ]);

            // Create booking item for the event
            $bookingItem = BookingItem::create([
                'booking_id' => $booking->id,
                'item_type' => 'EVENT',
                'item_id' => $event->id,
                'item_name' => $event->event_name_primary,
                'item_name_secondary' => $event->event_name_secondary,
                'service_date' => $selectedDates[0], // First date
                'quantity' => $numParticipants,
                'unit_price' => $eventPrice,
                'total_price' => $subtotal,
                'status' => 'BOOKED',
            ]);

            // Store selected dates as meta
            BookingItemMeta::create([
                'booking_item_id' => $bookingItem->id,
                'meta_key' => 'selected_dates',
                'meta_value' => json_encode($selectedDates),
                'meta_type' => 'json',
                'created_at' => now(),
            ]);

            // Store participants as meta
            BookingItemMeta::create([
                'booking_item_id' => $bookingItem->id,
                'meta_key' => 'participants',
                'meta_value' => json_encode($participants),
                'meta_type' => 'json',
                'created_at' => now(),
            ]);

            // Store extra charges as meta
            if (!empty($extraCharges)) {
                BookingItemMeta::create([
                    'booking_item_id' => $bookingItem->id,
                    'meta_key' => 'extra_charges',
                    'meta_value' => json_encode($extraCharges),
                    'meta_type' => 'json',
                    'created_at' => now(),
                ]);
            }

            // Store discount reason if applicable
            if ($discountAmount > 0 && $request->discount_reason) {
                BookingItemMeta::create([
                    'booking_item_id' => $bookingItem->id,
                    'meta_key' => 'discount_reason',
                    'meta_value' => $request->discount_reason,
                    'meta_type' => 'string',
                    'created_at' => now(),
                ]);
            }

            // Create payment record
            $paymentReference = $this->generatePaymentReference();
            
            BookingPayment::create([
                'booking_id' => $booking->id,
                'payment_date' => now(),
                'amount' => $paidAmount,
                'payment_mode_id' => $request->payment_mode_id,
                'payment_method' => PaymentMode::find($request->payment_mode_id)->name,
                'payment_reference' => $paymentReference,
                'payment_type' => $request->payment_type,
                'payment_status' => 'SUCCESS',
                'created_by' => auth()->id(),
            ]);

            DB::commit();

            // Return booking details for receipt
            return response()->json([
                'success' => true,
                'message' => 'Event booking created successfully',
                'data' => [
                    'booking_id' => $booking->id,
                    'booking_number' => $bookingNumber,
                    'payment_reference' => $paymentReference,
                    'event' => [
                        'name' => $event->event_name_primary,
                        'name_secondary' => $event->event_name_secondary,
                        'dates' => $selectedDates,
                    ],
                    'participants' => $participants,
                    'extra_charges' => $extraCharges,
                    'subtotal' => $subtotal,
                    'extra_charges_total' => $extraChargesTotal,
                    'discount_amount' => $discountAmount,
                    'total_amount' => $totalAmount,
                    'paid_amount' => $paidAmount,
                    'balance_amount' => $totalAmount - $paidAmount,
                    'payment_status' => $paidAmount >= $totalAmount ? 'PAID' : 'PARTIAL',
                    'booking_date' => now()->format('Y-m-d H:i:s'),
                ]
            ]);

        } catch (\Exception $e) {
            DB::rollBack();
            return response()->json([
                'success' => false,
                'message' => 'Failed to create booking: ' . $e->getMessage()
            ], 500);
        }
    }

    /**
     * Get booking details for receipt
     */
    public function getBookingReceipt($id)
    {
        try {
            $booking = Booking::with(['bookingItems.meta', 'payments.paymentMode'])
                ->findOrFail($id);

            $bookingItem = $booking->bookingItems->first();
            $event = Event::find($bookingItem->item_id);

            $selectedDates = [];
            $participants = [];
            $extraCharges = [];
            $discountReason = null;

            foreach ($bookingItem->meta as $meta) {
                switch ($meta->meta_key) {
                    case 'selected_dates':
                        $selectedDates = json_decode($meta->meta_value, true);
                        break;
                    case 'participants':
                        $participants = json_decode($meta->meta_value, true);
                        break;
                    case 'extra_charges':
                        $extraCharges = json_decode($meta->meta_value, true);
                        break;
                    case 'discount_reason':
                        $discountReason = $meta->meta_value;
                        break;
                }
            }

            $payment = $booking->payments->first();

            return response()->json([
                'success' => true,
                'data' => [
                    'booking_id' => $booking->id,
                    'booking_number' => $booking->booking_number,
                    'booking_date' => $booking->booking_date->format('Y-m-d H:i:s'),
                    'booking_status' => $booking->booking_status,
                    'payment_status' => $booking->payment_status,
                    'event' => [
                        'id' => $event->id,
                        'name' => $event->event_name_primary,
                        'name_secondary' => $event->event_name_secondary,
                        'price' => (float) $bookingItem->unit_price,
                    ],
                    'selected_dates' => $selectedDates,
                    'participants' => $participants,
                    'extra_charges' => $extraCharges,
                    'subtotal' => (float) $booking->subtotal,
                    'discount_amount' => (float) $booking->discount_amount,
                    'discount_reason' => $discountReason,
                    'total_amount' => (float) $booking->total_amount,
                    'paid_amount' => (float) $booking->paid_amount,
                    'balance_amount' => (float) ($booking->total_amount - $booking->paid_amount),
                    'payment' => $payment ? [
                        'reference' => $payment->payment_reference,
                        'method' => $payment->payment_method,
                        'amount' => (float) $payment->amount,
                        'date' => $payment->payment_date->format('Y-m-d H:i:s'),
                        'status' => $payment->payment_status,
                    ] : null,
                ]
            ]);
        } catch (\Exception $e) {
            return response()->json([
                'success' => false,
                'message' => 'Failed to fetch booking: ' . $e->getMessage()
            ], 500);
        }
    }

    /**
     * Generate booking number
     */
    private function generateBookingNumber()
    {
        $prefix = 'EVT';
        $date = now()->format('Ymd');
        
        $lastBooking = Booking::where('booking_number', 'like', $prefix . $date . '%')
            ->orderBy('booking_number', 'desc')
            ->first();

        if ($lastBooking) {
            $lastNumber = (int) substr($lastBooking->booking_number, -7);
            $newNumber = str_pad($lastNumber + 1, 7, '0', STR_PAD_LEFT);
        } else {
            $newNumber = '0000001';
        }

        return $prefix . $date . $newNumber;
    }

    /**
     * Generate payment reference
     */
    private function generatePaymentReference()
    {
        $prefix = 'PAY';
        $timestamp = now()->format('YmdHis');
        $random = str_pad(mt_rand(1, 99999), 5, '0', STR_PAD_LEFT);
        
        return $prefix . $timestamp . $random;
    }
}