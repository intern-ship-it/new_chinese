<?php

namespace App\Services;

use Barryvdh\DomPDF\Facade\Pdf;
use Illuminate\Support\Facades\Log;
use Illuminate\Support\Facades\Storage;

class PdfService
{
    /**
     * Generate Booking History Receipt PDF using DomPDF
     * 
     * @param array $bookingData - Enriched booking data
     * @param array $templeSettings - Temple configuration
     * @param bool $returnContent - If true, returns PDF content; if false, downloads
     * @return mixed
     */
    public function generateBookingHistoryReceipt($bookingData, $templeSettings, $returnContent = false)
    {
        try {
            $currency = $templeSettings['currency'] ?? 'RM';
            
            // Prepare data for view
            $data = [
                'booking' => $bookingData,
                'temple' => $templeSettings,
                'currency' => $currency,
                'generated_at' => now()->format('d/m/Y H:i:s')
            ];

            // Generate PDF using Blade view
            $pdf = Pdf::loadView('pdf.booking-receipt', $data);
            
            // Set paper size and orientation
            $pdf->setPaper('A3', 'portrait');
            
            // Set options for better rendering
            $pdf->setOptions([
                'isHtml5ParserEnabled' => true,
                'isRemoteEnabled' => true,
                'defaultFont' => 'DejaVu Sans',
                'enable_php' => false,
                'dpi' => 150,
                'defaultMediaType' => 'print',
                'isFontSubsettingEnabled' => true,
            ]);

            // Generate filename
            $filename = $bookingData['booking_number'] . '-receipt.pdf';

            if ($returnContent) {
                // Return PDF content as string
                return $pdf->output();
            }

            // Download PDF
            return $pdf->download($filename);

        } catch (\Exception $e) {
            Log::error('PDF Generation Error', [
                'booking_number' => $bookingData['booking_number'] ?? 'unknown',
                'error' => $e->getMessage(),
                'trace' => $e->getTraceAsString()
            ]);

            throw $e;
        }
    }

    /**
     * Generate Booking History Report PDF (for multiple bookings)
     * 
     * @param array $bookings - Array of booking data
     * @param array $templeSettings - Temple configuration
     * @param array $filters - Applied filters
     * @param array $summary - Summary statistics
     * @param array $user - User who generated the report
     * @return mixed
     */
    public function generateBookingHistoryReport($bookings, $templeSettings, $filters, $summary, $user)
    {
        try {
            $currency = $templeSettings['currency'] ?? 'RM';
            
            // Prepare data for view
            $data = [
                'bookings' => $bookings,
                'temple' => $templeSettings,
                'currency' => $currency,
                'filters' => $filters,
                'summary' => $summary,
                'user' => $user,
                'generated_at' => now()->format('d/m/Y H:i:s')
            ];

            // Generate PDF using Blade view
            $pdf = Pdf::loadView('pdf.booking-history-report', $data);
            
            // Set paper size and orientation (landscape for reports)
            $pdf->setPaper('A4', 'landscape');
            
            // Set options
            $pdf->setOptions([
                'isHtml5ParserEnabled' => true,
                'isRemoteEnabled' => true,
                'defaultFont' => 'DejaVu Sans',
                'dpi' => 150,
                'defaultMediaType' => 'print',
            ]);

            // Generate filename
            $filename = 'booking-history-report-' . date('Y-m-d-His') . '.pdf';

            return $pdf->download($filename);

        } catch (\Exception $e) {
            Log::error('Report PDF Generation Error', [
                'error' => $e->getMessage(),
                'trace' => $e->getTraceAsString()
            ]);

            throw $e;
        }
    }
}