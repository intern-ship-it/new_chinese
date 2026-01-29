<?php

namespace App\Http\Controllers;

use App\Http\Controllers\Controller;
use App\Services\PdfService;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Log;
use Illuminate\Support\Facades\URL;
use Carbon\Carbon;
use ZipArchive;

class BookingHistoryController extends Controller
{
    protected $pdfService;

    public function __construct(PdfService $pdfService)
    {
        $this->pdfService = $pdfService;
    }

    const TYPE_SALES = 'SALES';
    const TYPE_DONATION = 'DONATION';
    const TYPE_BUDDHA_LAMP = 'BUDDHA_LAMP';
    const TYPE_SPECIAL_OCCASIONS = 'SPECIAL_OCCASIONS';

    /**
     * Get temple ID from request headers or subdomain
     */
    private function getTempleId()
    {
        // First, try from X-Temple-ID header
        $templeId = request()->header('X-Temple-ID');
        
        if ($templeId) {
            return $templeId;
        }

        // Try to extract from subdomain (e.g., temple3.chinesetemplesystems.xyz)
        $host = request()->getHost();
        if (preg_match('/^(temple\d+)\./', $host, $matches)) {
            return $matches[1];
        }

        // Fallback to default
        return 'temple1';
    }

    /**
     * Get booking history for the authenticated user
     * OR generate PDFs if download parameter is set
     */
    public function index(Request $request)
    {
        try {
            $user = auth()->user();

            if (!$user) {
                return response()->json([
                    'success' => false,
                    'message' => 'Unauthorized'
                ], 401);
            }

            // Check if PDF download is requested
            if ($request->input('download') === 'pdf') {
                return $this->generatePdfReport($request, $user);
            }

            // Original listing functionality with PDF URLs
            return $this->listBookings($request, $user);
        } catch (\Exception $e) {
            Log::error('Booking History Error', [
                'user_id' => auth()->id(),
                'error' => $e->getMessage(),
                'trace' => $e->getTraceAsString()
            ]);

            return response()->json([
                'success' => false,
                'message' => 'Failed to process request: ' . $e->getMessage()
            ], 500);
        }
    }

    /**
     * List bookings with signed PDF URLs (requires authentication)
     */
    private function listBookings(Request $request, $user)
    {
        $bookingType = $request->input('booking_type');
        $status = $request->input('status');
        $paymentStatus = $request->input('payment_status');
        $fromDate = $request->input('from_date');
        $toDate = $request->input('to_date');
        $perPage = $request->input('per_page', 20);
        $page = $request->input('page', 1);

        $validTypes = [
            self::TYPE_SALES,
            self::TYPE_DONATION,
            self::TYPE_BUDDHA_LAMP,
            self::TYPE_SPECIAL_OCCASIONS
        ];

        if ($bookingType && !in_array($bookingType, $validTypes)) {
            return response()->json([
                'success' => false,
                'message' => 'Invalid booking type. Valid types: ' . implode(', ', $validTypes)
            ], 422);
        }

        $query = DB::table('bookings as b')
            ->where(function ($q) use ($user) {
                $q->where('b.user_id', $user->id)
                    ->orWhere('b.created_by', $user->id);
            })
            ->select([
                'b.id',
                'b.booking_number',
                'b.booking_type',
                'b.booking_date',
                'b.booking_status',
                'b.payment_status',
                'b.subtotal',
                'b.tax_amount',
                'b.discount_amount',
                'b.deposit_amount',
                'b.total_amount',
                'b.paid_amount',
                'b.print_option',
                'b.created_at',
            ]);

        if ($bookingType) {
            $query->where('b.booking_type', $bookingType);
        }

        if ($status) {
            $query->where('b.booking_status', $status);
        }

        if ($paymentStatus) {
            $query->where('b.payment_status', $paymentStatus);
        }

        if ($fromDate) {
            $query->where('b.booking_date', '>=', Carbon::parse($fromDate)->startOfDay());
        }

        if ($toDate) {
            $query->where('b.booking_date', '<=', Carbon::parse($toDate)->endOfDay());
        }

        $total = $query->count();

        $bookings = $query->orderBy('b.created_at', 'desc')
            ->offset(($page - 1) * $perPage)
            ->limit($perPage)
            ->get();

        // Enrich bookings with details and signed PDF URLs
        $enrichedBookings = [];
        
        foreach ($bookings as $booking) {
            $enriched = $this->enrichBookingData($booking);
            
            // Add PDF URL for FULL payment bookings (works without authentication)
            if ($booking->payment_status === 'FULL') {
                $templeId = $this->getTempleId(); // Get current temple context
                
                $enriched['pdf_url'] = route('booking.pdf.download', [
                    'id' => $booking->id,
                    'temple_id' => $templeId  // Include temple ID in URL
                ]);
            } else {
                $enriched['pdf_url'] = null;
            }
            
            $enrichedBookings[] = $enriched;
        }

        // Add bulk download URL if there are FULL payment bookings
        $fullPaymentCount = DB::table('bookings')
            ->where(function ($q) use ($user) {
                $q->where('user_id', $user->id)
                    ->orWhere('created_by', $user->id);
            })
            ->where('payment_status', 'FULL');

        if ($bookingType) $fullPaymentCount->where('booking_type', $bookingType);
        if ($fromDate) $fullPaymentCount->where('booking_date', '>=', Carbon::parse($fromDate)->startOfDay());
        if ($toDate) $fullPaymentCount->where('booking_date', '<=', Carbon::parse($toDate)->endOfDay());
        
        $fullPaymentTotal = $fullPaymentCount->count();

        $bulkDownloadUrl = null;
        if ($fullPaymentTotal > 0) {
            $params = array_filter([
                'download' => 'pdf',
                'booking_type' => $bookingType,
                'from_date' => $fromDate,
                'to_date' => $toDate,
            ]);
            $bulkDownloadUrl = url('/api/v1/booking-history?' . http_build_query($params));
        }

        return response()->json([
            'success' => true,
            'data' => [
                'bookings' => $enrichedBookings,
                'pagination' => [
                    'total' => $total,
                    'per_page' => $perPage,
                    'current_page' => $page,
                    'last_page' => ceil($total / $perPage),
                    'from' => (($page - 1) * $perPage) + 1,
                    'to' => min($page * $perPage, $total)
                ],
                'filters' => [
                    'booking_type' => $bookingType,
                    'status' => $status,
                    'payment_status' => $paymentStatus,
                    'from_date' => $fromDate,
                    'to_date' => $toDate
                ],
                'download' => [
                    'bulk_pdf_url' => $bulkDownloadUrl,
                    'full_payment_count' => $fullPaymentTotal,
                    'message' => $fullPaymentTotal > 0 
                        ? "Use bulk_pdf_url to download all {$fullPaymentTotal} receipts in a ZIP file" 
                        : 'No bookings with FULL payment status available for download'
                ]
            ]
        ]);
    }

    /**
     * Generate PDF report with separate PDFs for FULL payment bookings
     */
    private function generatePdfReport(Request $request, $user)
    {
        $bookingType = $request->input('booking_type');
        $fromDate = $request->input('from_date');
        $toDate = $request->input('to_date');

        $query = DB::table('bookings as b')
            ->where(function ($q) use ($user) {
                $q->where('b.user_id', $user->id)
                    ->orWhere('b.created_by', $user->id);
            })
            ->where('b.payment_status', 'FULL');

        if ($bookingType) {
            $query->where('b.booking_type', $bookingType);
        }
        if ($fromDate) {
            $query->where('b.booking_date', '>=', Carbon::parse($fromDate)->startOfDay());
        }
        if ($toDate) {
            $query->where('b.booking_date', '<=', Carbon::parse($toDate)->endOfDay());
        }

        $bookings = $query->orderBy('b.created_at', 'desc')->get();

        if ($bookings->isEmpty()) {
            return response()->json([
                'success' => false,
                'message' => 'No bookings with FULL payment status found for the selected filters'
            ], 404);
        }

        // Get temple settings
        $templeSettings = $this->getTempleSettings();

        // Create temporary directory for PDFs
        $tempDir = storage_path('app/temp/booking-reports-' . uniqid());
        if (!file_exists($tempDir)) {
            mkdir($tempDir, 0755, true);
        }

        $pdfFiles = [];
        $failedBookings = [];

        // Generate individual PDFs for each booking
        foreach ($bookings as $booking) {
            try {
                $bookingData = $this->enrichBookingData($booking, true);

                $pdfContent = $this->pdfService->generateBookingHistoryReceipt(
                    $bookingData,
                    $templeSettings,
                    true // Return content
                );

                $filename = $booking->booking_number . '.pdf';
                $filepath = $tempDir . '/' . $filename;
                file_put_contents($filepath, $pdfContent);

                $pdfFiles[] = [
                    'path' => $filepath,
                    'name' => $filename
                ];
            } catch (\Exception $e) {
                Log::error('Failed to generate PDF for booking', [
                    'booking_id' => $booking->id,
                    'booking_number' => $booking->booking_number,
                    'error' => $e->getMessage()
                ]);
                $failedBookings[] = $booking->booking_number;
            }
        }

        if (empty($pdfFiles)) {
            $this->cleanupTempDirectory($tempDir);
            return response()->json([
                'success' => false,
                'message' => 'Failed to generate any PDF receipts',
                'failed_bookings' => $failedBookings
            ], 500);
        }

        // Create ZIP file
        $zipFilename = 'booking-receipts-' . date('Y-m-d-His') . '.zip';
        $zipPath = $tempDir . '/' . $zipFilename;

        $zip = new ZipArchive();
        if ($zip->open($zipPath, ZipArchive::CREATE | ZipArchive::OVERWRITE) !== true) {
            $this->cleanupTempDirectory($tempDir);
            return response()->json([
                'success' => false,
                'message' => 'Failed to create ZIP file'
            ], 500);
        }

        foreach ($pdfFiles as $pdfFile) {
            $zip->addFile($pdfFile['path'], $pdfFile['name']);
        }

        $zip->close();

        if (!empty($failedBookings)) {
            Log::warning('Some bookings failed to generate PDFs', [
                'total_bookings' => count($bookings),
                'successful' => count($pdfFiles),
                'failed' => count($failedBookings),
                'failed_booking_numbers' => $failedBookings
            ]);
        }

        // Return file download with proper cleanup
        return response()->download($zipPath, $zipFilename, [
            'Content-Type' => 'application/zip',
            'Content-Disposition' => 'attachment; filename="' . $zipFilename . '"'
        ])->deleteFileAfterSend(true);
    }

    /**
     * Clean up temporary directory
     */
    private function cleanupTempDirectory($dir)
    {
        if (!file_exists($dir)) {
            return;
        }

        $files = glob($dir . '/*');
        foreach ($files as $file) {
            if (is_file($file)) {
                @unlink($file);
            }
        }
        @rmdir($dir);
    }

    /**
     * Download single booking receipt as PDF (PUBLIC with temple context)
     * 
     * This endpoint is accessible WITHOUT authentication but requires:
     * 1. Temple ID in URL parameters (handled by temple middleware)
     * 2. Booking must exist and have FULL payment status
     */
    public function downloadPdf(Request $request, $id)
    {
        try {
            // No authentication required - temple middleware handles DB connection
            
            // Get temple_id from URL parameter
            $templeId = $request->input('temple_id');
            
            if (!$templeId) {
                Log::warning('PDF download attempted without temple_id', [
                    'booking_id' => $id,
                    'ip' => $request->ip()
                ]);
                
                return response()->json([
                    'success' => false,
                    'message' => 'Temple identifier is required'
                ], 400);
            }
            
            Log::info('PDF Download Request', [
                'booking_id' => $id,
                'temple_id' => $templeId,
                'ip' => $request->ip(),
                'user_agent' => $request->userAgent()
            ]);

            // Query the booking from the correct temple database
            $booking = DB::table('bookings as b')
                ->where('b.id', $id)
                ->select([
                    'b.id',
                    'b.booking_number',
                    'b.booking_type',
                    'b.booking_date',
                    'b.booking_status',
                    'b.payment_status',
                    'b.subtotal',
                    'b.tax_amount',
                    'b.discount_amount',
                    'b.deposit_amount',
                    'b.total_amount',
                    'b.paid_amount',
                    'b.print_option',
                    'b.special_instructions',
                    'b.created_at',
                ])
                ->first();

            if (!$booking) {
                Log::warning('Booking not found for PDF download', [
                    'booking_id' => $id,
                    'temple_id' => $templeId
                ]);
                
                return response()->json([
                    'success' => false,
                    'message' => 'Booking not found'
                ], 404);
            }

            // Check if payment is FULL
            if ($booking->payment_status !== 'FULL') {
                Log::warning('PDF download attempted for non-FULL payment booking', [
                    'booking_id' => $id,
                    'booking_number' => $booking->booking_number,
                    'payment_status' => $booking->payment_status,
                    'temple_id' => $templeId
                ]);
                
                return response()->json([
                    'success' => false,
                    'message' => 'PDF is only available for bookings with FULL payment status. Current status: ' . $booking->payment_status
                ], 403);
            }

            Log::info('Generating PDF for booking', [
                'booking_id' => $id,
                'booking_number' => $booking->booking_number,
                'temple_id' => $templeId
            ]);

            $bookingData = $this->enrichBookingData($booking, true);
            $templeSettings = $this->getTempleSettings();

            return $this->pdfService->generateBookingHistoryReceipt(
                $bookingData,
                $templeSettings,
                false // Download directly
            );
        } catch (\Exception $e) {
            Log::error('PDF Generation Error', [
                'booking_id' => $id,
                'temple_id' => $request->input('temple_id'),
                'error' => $e->getMessage(),
                'trace' => $e->getTraceAsString()
            ]);

            return response()->json([
                'success' => false,
                'message' => 'Failed to generate PDF: ' . $e->getMessage(),
                'error' => config('app.debug') ? $e->getMessage() : 'Internal error'
            ], 500);
        }
    }

    /**
     * Get single booking details
     */
    public function show($id)
    {
        try {
            $user = auth()->user();

            if (!$user) {
                return response()->json([
                    'success' => false,
                    'message' => 'Unauthorized'
                ], 401);
            }

            $booking = DB::table('bookings as b')
                ->where('b.id', $id)
                ->where(function ($q) use ($user) {
                    $q->where('b.user_id', $user->id)
                        ->orWhere('b.created_by', $user->id);
                })
                ->select([
                    'b.id',
                    'b.booking_number',
                    'b.booking_type',
                    'b.booking_date',
                    'b.booking_status',
                    'b.payment_status',
                    'b.subtotal',
                    'b.tax_amount',
                    'b.discount_amount',
                    'b.deposit_amount',
                    'b.total_amount',
                    'b.paid_amount',
                    'b.print_option',
                    'b.special_instructions',
                    'b.created_at',
                ])
                ->first();

            if (!$booking) {
                return response()->json([
                    'success' => false,
                    'message' => 'Booking not found'
                ], 404);
            }

            $enrichedBooking = $this->enrichBookingData($booking, true);

            // Add PDF URL for FULL payment bookings
            if ($booking->payment_status === 'FULL') {
                $templeId = $this->getTempleId(); // Get current temple context
                
                $enrichedBooking['pdf_url'] = route('booking.pdf.download', [
                    'id' => $booking->id,
                    'temple_id' => $templeId  // Include temple ID in URL
                ]);
            } else {
                $enrichedBooking['pdf_url'] = null;
            }

            return response()->json([
                'success' => true,
                'data' => $enrichedBooking
            ]);
        } catch (\Exception $e) {
            Log::error('Booking Details Error', [
                'booking_id' => $id,
                'user_id' => auth()->id(),
                'error' => $e->getMessage()
            ]);

            return response()->json([
                'success' => false,
                'message' => 'Failed to fetch booking details: ' . $e->getMessage()
            ], 500);
        }
    }

    /**
     * Get available booking types
     */
    public function getBookingTypes()
    {
        return response()->json([
            'success' => true,
            'data' => [
                [
                    'code' => self::TYPE_SALES,
                    'name' => 'Sales / Archanai',
                    'name_secondary' => 'அர்ச்சனை',
                    'description' => 'Prasadam, offerings, and archana services'
                ],
                [
                    'code' => self::TYPE_DONATION,
                    'name' => 'Donation',
                    'name_secondary' => 'நன்கொடை',
                    'description' => 'General donations and pledges'
                ],
                [
                    'code' => self::TYPE_BUDDHA_LAMP,
                    'name' => 'Buddha Lamp',
                    'name_secondary' => 'புத்த விளக்கு',
                    'description' => 'Buddha lamp offerings'
                ],
                [
                    'code' => self::TYPE_SPECIAL_OCCASIONS,
                    'name' => 'Temple Events',
                    'name_secondary' => 'கோவில் நிகழ்வுகள்',
                    'description' => 'Special occasions and temple event bookings'
                ]
            ]
        ]);
    }

    /**
     * Enrich booking data with related information
     */
    private function enrichBookingData($booking, $includeFullDetails = false)
    {
        $data = [
            'id' => $booking->id,
            'booking_number' => $booking->booking_number,
            'booking_type' => $booking->booking_type,
            'booking_type_display' => $this->getBookingTypeDisplay($booking->booking_type),
            'booking_date' => $booking->booking_date,
            'booking_status' => $booking->booking_status,
            'booking_status_display' => $this->getStatusDisplay($booking->booking_status),
            'payment_status' => $booking->payment_status,
            'payment_status_display' => $this->getPaymentStatusDisplay($booking->payment_status),
            'amounts' => [
                'subtotal' => (float) $booking->subtotal,
                'tax' => (float) $booking->tax_amount,
                'discount' => (float) $booking->discount_amount,
                'deposit' => (float) $booking->deposit_amount,
                'total' => (float) $booking->total_amount,
                'paid' => (float) $booking->paid_amount,
                'balance' => (float) ($booking->total_amount - $booking->paid_amount)
            ],
            'created_at' => $booking->created_at,
        ];

        $data['items'] = $this->getBookingItems($booking->id);
        $data['item_count'] = count($data['items']);

        if ($includeFullDetails) {
            $data['devotee'] = $this->getDevoteeInfo($booking->id);
            $data['payments'] = $this->getPaymentHistory($booking->id);
            $data['meta'] = $this->getBookingMeta($booking->id, $booking->booking_type);

            if (isset($booking->special_instructions)) {
                $data['special_instructions'] = $booking->special_instructions;
            }

            $data['print_option'] = $booking->print_option;
        }

        return $data;
    }

    /**
     * Get booking items with deity information
     */
    private function getBookingItems($bookingId)
    {
        return DB::table('booking_items as bi')
            ->leftJoin('deities as d', 'bi.deity_id', '=', 'd.id')
            ->where('bi.booking_id', $bookingId)
            ->select([
                'bi.id',
                'bi.item_type',
                'bi.item_name',
                'bi.item_name_secondary',
                'bi.short_code',
                'bi.quantity',
                'bi.unit_price',
                'bi.total_price',
                'bi.status',
                'bi.add_ons',
                'd.name as deity_name',
                'd.name_secondary as deity_name_secondary',
                'd.image_url as deity_image_url'
            ])
            ->orderBy('bi.add_ons', 'asc')
            ->orderBy('bi.id', 'asc')
            ->get()
            ->map(function ($item) {
                return [
                    'id' => $item->id,
                    'type' => $item->item_type,
                    'name' => $item->item_name,
                    'name_secondary' => $item->item_name_secondary,
                    'short_code' => $item->short_code,
                    'quantity' => (int) $item->quantity,
                    'unit_price' => (float) $item->unit_price,
                    'total_price' => (float) $item->total_price,
                    'status' => $item->status,
                    'is_addon' => (bool) $item->add_ons,
                    'image_url' => $item->deity_image_url,
                    'deity' => $item->deity_name ? [
                        'name' => $item->deity_name,
                        'name_secondary' => $item->deity_name_secondary,
                        'image_url' => $item->deity_image_url
                    ] : null
                ];
            })
            ->toArray();
    }

    /**
     * Get devotee information from booking meta
     */
    private function getDevoteeInfo($bookingId)
    {
        $meta = DB::table('booking_meta')
            ->where('booking_id', $bookingId)
            ->whereIn('meta_key', [
                'devotee_name',
                'devotee_email',
                'devotee_nric',
                'devotee_phone',
                'devotee_phone_code',
                'name_primary',
                'name_secondary',
                'name_chinese',
                'name_english',
                'nric',
                'email',
                'phone_no',
                'contact_no'
            ])
            ->pluck('meta_value', 'meta_key');

        if ($meta->isEmpty()) {
            return null;
        }

        return [
            'name' => $meta['devotee_name'] ?? $meta['name_primary'] ?? $meta['name_english'] ?? null,
            'name_chinese' => $meta['name_chinese'] ?? $meta['name_secondary'] ?? null,
            'email' => $meta['devotee_email'] ?? $meta['email'] ?? null,
            'nric' => $meta['devotee_nric'] ?? $meta['nric'] ?? null,
            'phone' => trim(($meta['devotee_phone_code'] ?? '') . ' ' . ($meta['devotee_phone'] ?? $meta['phone_no'] ?? $meta['contact_no'] ?? ''))
        ];
    }

    /**
     * Get payment history for booking
     */
    private function getPaymentHistory($bookingId)
    {
        $hasRemarksColumn = DB::getSchemaBuilder()->hasColumn('booking_payments', 'remarks');

        $selectFields = [
            'bp.id',
            'bp.payment_reference',
            'bp.payment_method',
            'bp.payment_type',
            'bp.amount',
            'bp.payment_date',
            'bp.payment_status',
            'pm.name as payment_mode_name',
            'bp.created_at'
        ];

        if ($hasRemarksColumn) {
            $selectFields[] = 'bp.remarks';
        }

        return DB::table('booking_payments as bp')
            ->leftJoin('payment_modes as pm', 'bp.payment_mode_id', '=', 'pm.id')
            ->where('bp.booking_id', $bookingId)
            ->select($selectFields)
            ->orderBy('bp.created_at', 'desc')
            ->get()
            ->map(function ($payment) use ($hasRemarksColumn) {
                $data = [
                    'id' => $payment->id,
                    'reference' => $payment->payment_reference,
                    'method' => $payment->payment_method,
                    'type' => $payment->payment_type,
                    'amount' => (float) $payment->amount,
                    'date' => $payment->payment_date,
                    'status' => $payment->payment_status,
                    'payment_mode' => $payment->payment_mode_name,
                    'created_at' => $payment->created_at
                ];

                if ($hasRemarksColumn) {
                    $data['remarks'] = $payment->remarks ?? null;
                }

                return $data;
            })
            ->toArray();
    }

    /**
     * Get booking type-specific metadata
     */
    private function getBookingMeta($bookingId, $bookingType)
    {
        $meta = DB::table('booking_meta')
            ->where('booking_id', $bookingId)
            ->pluck('meta_value', 'meta_key');

        if ($meta->isEmpty()) {
            return [];
        }

        switch ($bookingType) {
            case self::TYPE_DONATION:
                return [
                    'donation_id' => $meta['donation_id'] ?? null,
                    'donation_name' => $meta['donation_name'] ?? null,
                    'donation_type' => $meta['donation_type'] ?? null,
                    'is_pledge' => ($meta['is_pledge'] ?? 'false') === 'true',
                    'pledge_amount' => isset($meta['pledge_amount']) ? (float) $meta['pledge_amount'] : null,
                    'pledge_balance' => isset($meta['pledge_balance']) ? (float) $meta['pledge_balance'] : null,
                    'is_anonymous' => ($meta['is_anonymous'] ?? 'false') === 'true'
                ];

            case self::TYPE_BUDDHA_LAMP:
                return [
                    'buddha_lamp_master_id' => $meta['buddha_lamp_master_id'] ?? null,
                    'buddha_lamp_name' => $meta['buddha_lamp_name'] ?? null
                ];

            case self::TYPE_SPECIAL_OCCASIONS:
                return [
                    'occasion_id' => $meta['occasion_id'] ?? null,
                    'occasion_name' => $meta['occasion_name'] ?? null,
                    'option_id' => $meta['option_id'] ?? null,
                    'option_name' => $meta['option_name'] ?? null,
                    'event_date' => $meta['event_date'] ?? null,
                    'event_time' => $meta['event_time'] ?? $meta['slot_time'] ?? null,
                    'package_name' => $meta['package_name'] ?? null
                ];

            case self::TYPE_SALES:
            default:
                return $meta->toArray();
        }
    }

    /**
     * Get display name for booking type
     */
    private function getBookingTypeDisplay($type)
    {
        $types = [
            self::TYPE_SALES => 'Archanai',
            self::TYPE_DONATION => 'Donation',
            self::TYPE_BUDDHA_LAMP => 'Buddha Lamp',
            self::TYPE_SPECIAL_OCCASIONS => 'Temple Events'
        ];

        return $types[$type] ?? $type;
    }

    /**
     * Get display name for booking status
     */
    private function getStatusDisplay($status)
    {
        $statuses = [
            'PENDING' => 'Pending',
            'CONFIRMED' => 'Confirmed',
            'COMPLETED' => 'Completed',
            'CANCELLED' => 'Cancelled'
        ];

        return $statuses[$status] ?? $status;
    }

    /**
     * Get display name for payment status
     */
    private function getPaymentStatusDisplay($status)
    {
        $statuses = [
            'PENDING' => 'Pending',
            'PARTIAL' => 'Partial',
            'PAID' => 'Paid',
            'FULL' => 'Paid',
            'REFUNDED' => 'Refunded'
        ];

        return $statuses[$status] ?? $status;
    }

    /**
     * Get temple settings from database
     */
    private function getTempleSettings()
    {
        try {
            if (!DB::getSchemaBuilder()->hasTable('system_settings')) {
                return $this->getDefaultTempleSettings();
            }

            $settings = DB::table('system_settings')
                ->whereIn('key', [
                    'temple_name',
                    'temple_name_secondary',
                    'temple_name_chinese',
                    'temple_address',
                    'temple_address_line_1',
                    'temple_address_line_2',
                    'temple_city',
                    'temple_state',
                    'temple_pincode',
                    'temple_postcode',
                    'temple_country',
                    'temple_phone',
                    'temple_email',
                    'temple_website',
                    'temple_logo',
                    'currency',
                    'currency_symbol'
                ])
                ->pluck('value', 'key');

            $addressParts = array_filter([
                $settings['temple_address'] ?? $settings['temple_address_line_1'] ?? '',
                $settings['temple_address_line_2'] ?? '',
                $settings['temple_city'] ?? '',
                $settings['temple_state'] ?? '',
                $settings['temple_pincode'] ?? $settings['temple_postcode'] ?? '',
            ]);

            $fullAddress = implode(', ', $addressParts);
            if (!empty($settings['temple_country'])) {
                $fullAddress .= ', ' . $settings['temple_country'];
            }

            return [
                'temple_name' => $settings['temple_name'] ?? 'Temple Management System',
                'temple_name_chinese' => $settings['temple_name_chinese'] ?? $settings['temple_name_secondary'] ?? '',
                'address' => $fullAddress,
                'phone' => $settings['temple_phone'] ?? '',
                'email' => $settings['temple_email'] ?? '',
                'website' => $settings['temple_website'] ?? '',
                'currency' => $settings['currency_symbol'] ?? $settings['currency'] ?? 'RM',
                'logo_url' => $settings['temple_logo'] ?? null
            ];
        } catch (\Exception $e) {
            Log::warning('Failed to fetch temple settings', [
                'error' => $e->getMessage()
            ]);

            return $this->getDefaultTempleSettings();
        }
    }

    /**
     * Get default temple settings fallback
     */
    private function getDefaultTempleSettings()
    {
        return [
            'temple_name' => 'PERTUBUHAN PENGANUT DEWA AGAMA BUDDHA CHI TIAN SI',
            'temple_name_chinese' => '',
            'address' => 'LOT 212888 JALAN PERSIARAN SCIENTEX 2 TAMAN SCIENTEX 81700 PASIR GUDANG JOHOR BAHRU, JOHOR, PASIR GUDANG JOHOR 81700, Malaysia',
            'phone' => '12-308 3707',
            'email' => 'chitiansinmasa@gmail.com',
            'website' => '',
            'currency' => 'RM',
            'logo_url' => null
        ];
    }
}