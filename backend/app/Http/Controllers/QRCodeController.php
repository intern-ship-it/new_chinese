<?php

namespace App\Http\Controllers;

use App\Models\Booking;
use App\Models\BookingMeta;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Log;
use BaconQrCode\Renderer\ImageRenderer;
use BaconQrCode\Renderer\Image\SvgImageBackEnd;
use BaconQrCode\Renderer\Image\ImagickImageBackEnd;
use BaconQrCode\Renderer\RendererStyle\RendererStyle;
use BaconQrCode\Writer;
use Exception;

class QRCodeController extends Controller
{
    /**
     * Generate QR code for a booking
     * GET /api/bookings/{bookingId}/qr-code
     * 
     * @param string $bookingId
     * @param Request $request
     * @return Response
     */
    public function generateQRCode($bookingId, Request $request)
    {
        try {
            $booking = Booking::findOrFail($bookingId);

            // Create encrypted payload with booking reference (not static seat data)
            $qrData = encrypt([
                'booking_id' => $booking->id,
                'booking_number' => $booking->booking_number,
                'type' => 'special_occasion',
                'generated_at' => now()->toIso8601String()
            ]);

            // Get format from request (default: svg)
            $format = $request->get('format', 'svg');
            $size = $request->get('size', 300);

            // Generate QR code based on format
            if ($format === 'svg') {
                $renderer = new ImageRenderer(
                    new RendererStyle($size),
                    new SvgImageBackEnd()
                );
                $writer = new Writer($renderer);
                $qrCode = $writer->writeString($qrData);

                return response($qrCode)
                    ->header('Content-Type', 'image/svg+xml');
            } else {
                // For PNG or base64, use Imagick if available, otherwise SVG
                try {
                    $renderer = new ImageRenderer(
                        new RendererStyle($size),
                        new ImagickImageBackEnd()
                    );
                    $writer = new Writer($renderer);
                    $qrCode = $writer->writeString($qrData);

                    if ($format === 'base64') {
                        return response()->json([
                            'success' => true,
                            'data' => [
                                'qr_code' => 'data:image/png;base64,' . base64_encode($qrCode),
                                'format' => 'png',
                                'booking_number' => $booking->booking_number
                            ]
                        ]);
                    }

                    return response($qrCode)
                        ->header('Content-Type', 'image/png');
                } catch (\Exception $e) {
                    // Fallback to SVG if Imagick not available
                    $renderer = new ImageRenderer(
                        new RendererStyle($size),
                        new SvgImageBackEnd()
                    );
                    $writer = new Writer($renderer);
                    $qrCode = $writer->writeString($qrData);

                    if ($format === 'base64') {
                        return response()->json([
                            'success' => true,
                            'data' => [
                                'qr_code' => 'data:image/svg+xml;base64,' . base64_encode($qrCode),
                                'format' => 'svg',
                                'booking_number' => $booking->booking_number,
                                'note' => 'PNG not available, returned SVG instead'
                            ]
                        ]);
                    }

                    return response($qrCode)
                        ->header('Content-Type', 'image/svg+xml');
                }
            }

        } catch (Exception $e) {
            Log::error('QR Code Generation Error', [
                'booking_id' => $bookingId,
                'error' => $e->getMessage()
            ]);

            return response()->json([
                'success' => false,
                'message' => 'Failed to generate QR code',
                'error' => $e->getMessage()
            ], 500);
        }
    }

    /**
     * Verify/Scan QR code and return LIVE booking data
     * POST /api/qr/verify
     * 
     * @param Request $request
     * @return JsonResponse
     */
    public function verifyQRCode(Request $request)
    {
        try {
            $request->validate([
                'qr_data' => 'required|string'
            ]);

            // Decrypt the QR data
            $data = decrypt($request->qr_data);

            // Validate the decrypted data
            if (!isset($data['booking_id']) || !isset($data['type'])) {
                throw new Exception('Invalid QR code data');
            }

            // Get the booking with latest information
            $booking = Booking::with(['meta', 'items.meta'])
                ->findOrFail($data['booking_id']);

            // Get CURRENT seat assignment (not static data from QR)
            $currentSeatAssignment = $this->getCurrentSeatAssignment($booking);

            // Get devotee information
            $devoteeInfo = $this->getDevoteeInfo($booking);

            // Get event information
            $eventInfo = $this->getEventInfo($booking);

            // Return LIVE data
            return response()->json([
                'success' => true,
                'data' => [
                    'booking_number' => $booking->booking_number,
                    'booking_status' => $booking->booking_status,
                    'booking_date' => $booking->booking_date,
                    'event' => $eventInfo,
                    'devotee' => $devoteeInfo,
                    'current_seat' => $currentSeatAssignment,
                    'last_updated' => $booking->updated_at->toIso8601String(),
                    'qr_generated_at' => $data['generated_at'] ?? null,
                    'verified_at' => now()->toIso8601String()
                ]
            ], 200);

        } catch (Exception $e) {
            Log::error('QR Code Verification Error', [
                'error' => $e->getMessage(),
                'trace' => $e->getTraceAsString()
            ]);

            return response()->json([
                'success' => false,
                'message' => 'Failed to verify QR code',
                'error' => $e->getMessage()
            ], 400);
        }
    }

    /**
     * Get current seat assignment from booking meta
     * Always returns the LATEST seat information
     * 
     * @param Booking $booking
     * @return array|null
     */
    private function getCurrentSeatAssignment($booking)
    {
        $seatNumber = BookingMeta::where('booking_id', $booking->id)
            ->where('meta_key', 'seat_number')
            ->value('meta_value');

        $tableNumber = BookingMeta::where('booking_id', $booking->id)
            ->where('meta_key', 'table_number')
            ->value('meta_value');

        $rowNumber = BookingMeta::where('booking_id', $booking->id)
            ->where('meta_key', 'row_number')
            ->value('meta_value');

        $columnNumber = BookingMeta::where('booking_id', $booking->id)
            ->where('meta_key', 'column_number')
            ->value('meta_value');

        if (!$seatNumber && !$tableNumber) {
            return null;
        }

        return [
            'seat_number' => $seatNumber,
            'table_number' => $tableNumber,
            'row_number' => $rowNumber ? (int)$rowNumber : null,
            'column_number' => $columnNumber ? (int)$columnNumber : null,
            'location' => $this->formatLocation($tableNumber, $rowNumber, $columnNumber, $seatNumber)
        ];
    }

    /**
     * Format location string for display
     * 
     * @param string|null $table
     * @param int|null $row
     * @param int|null $column
     * @param string|null $seat
     * @return string
     */
    private function formatLocation($table, $row, $column, $seat)
    {
        $parts = [];

        if ($table) {
            $parts[] = "Table: {$table}";
        }

        if ($row && $column) {
            $parts[] = "Position: R{$row}C{$column}";
        }

        if ($seat) {
            $parts[] = "Seat: {$seat}";
        }

        return implode(' | ', $parts) ?: 'Not assigned';
    }

    /**
     * Get devotee information from booking
     * 
     * @param Booking $booking
     * @return array
     */
    private function getDevoteeInfo($booking)
    {
        $nameChinese = BookingMeta::where('booking_id', $booking->id)
            ->where('meta_key', 'name_chinese')
            ->value('meta_value');

        $nameEnglish = BookingMeta::where('booking_id', $booking->id)
            ->where('meta_key', 'name_english')
            ->value('meta_value');

        $nric = BookingMeta::where('booking_id', $booking->id)
            ->where('meta_key', 'nric')
            ->value('meta_value');

        $contactNo = BookingMeta::where('booking_id', $booking->id)
            ->where('meta_key', 'contact_no')
            ->value('meta_value');

        return [
            'name_chinese' => $nameChinese,
            'name_english' => $nameEnglish,
            'nric' => $nric,
            'contact_no' => $contactNo,
            'display_name' => $nameChinese ?: $nameEnglish ?: 'N/A'
        ];
    }

    /**
     * Get event information from booking
     * 
     * @param Booking $booking
     * @return array
     */
    private function getEventInfo($booking)
    {
        $occasionId = BookingMeta::where('booking_id', $booking->id)
            ->where('meta_key', 'special_occasion_id')
            ->value('meta_value');

        $eventDate = BookingMeta::where('booking_id', $booking->id)
            ->where('meta_key', 'event_date')
            ->value('meta_value');

        $eventName = null;
        if ($occasionId) {
            $occasion = \App\Models\SpecialOccasion::find($occasionId);
            if ($occasion) {
                $eventName = $occasion->occasion_name_primary;
            }
        }

        return [
            'occasion_id' => $occasionId,
            'event_name' => $eventName,
            'event_date' => $eventDate
        ];
    }

    /**
     * Generate QR code as base64 for embedding in receipts
     * Used internally by receipt generation
     * 
     * @param string $bookingId
     * @return string Base64 encoded SVG/PNG
     */
    public function generateQRCodeBase64($bookingId)
    {
        try {
            $booking = Booking::findOrFail($bookingId);

            $qrData = encrypt([
                'booking_id' => $booking->id,
                'booking_number' => $booking->booking_number,
                'type' => 'special_occasion',
                'generated_at' => now()->toIso8601String()
            ]);

            // Use SVG for better compatibility
            $renderer = new ImageRenderer(
                new RendererStyle(200),
                new SvgImageBackEnd()
            );
            $writer = new Writer($renderer);
            $qrCode = $writer->writeString($qrData);

            return 'data:image/svg+xml;base64,' . base64_encode($qrCode);

        } catch (Exception $e) {
            Log::error('QR Code Base64 Generation Error', [
                'booking_id' => $bookingId,
                'error' => $e->getMessage()
            ]);

            return null;
        }
    }
}
