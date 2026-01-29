<?php

namespace App\Http\Controllers;

use App\Http\Controllers\Controller;
use App\Models\Booking;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Log;
use Carbon\Carbon;
use Barryvdh\DomPDF\Facade\Pdf;

class DailyClosingController extends Controller
{
    /**
     * Module types for daily closing
     */
    const MODULE_SALES = 'SALES';
    const MODULE_DONATION = 'DONATION';
    const MODULE_BUDDHA_LAMP = 'BUDDHA_LAMP';
    const MODULE_SPECIAL_OCCASIONS = 'SPECIAL_OCCASIONS'; // Used by SpecialOccasionBookingController
    
    /**
     * Entry type constants (from entrytypes table)
     */
    const ENTRY_TYPE_RECEIPT = 1;
    const ENTRY_TYPE_PAYMENT = 2;
    const ENTRY_TYPE_JOURNAL = 3;
    
    /**
     * Invoice type for different modules in entries table
     */
    const INV_TYPE_DONATION = 2;
    const INV_TYPE_SALES = 3;
    const INV_TYPE_BUDDHA_LAMP = 4;
    const INV_TYPE_SPECIAL_OCCASIONS = 5; // For Temple Events/Special Occasions

    /**
     * User types that have full access to all counters' data
     */
    const ADMIN_USER_TYPES = ['SUPER_ADMIN', 'ADMIN'];

    /**
     * Check if the authenticated user is an admin (SUPER_ADMIN or ADMIN)
     */
    private function isAdminUser()
    {
        $user = auth()->user();
        return $user && in_array($user->user_type, self::ADMIN_USER_TYPES);
    }

    /**
     * Get the authenticated user's ID for filtering
     */
    private function getAuthUserId()
    {
        $user = auth()->user();
        return $user ? $user->id : null;
    }

    /**
     * Get daily closing report for Sales module
     */
    public function getSalesClosing(Request $request)
    {
        try {
            $fromDate = $request->input('from_date', Carbon::today()->format('Y-m-d'));
            $toDate = $request->input('to_date', Carbon::today()->format('Y-m-d'));
            $paymentModeId = $request->input('payment_mode_id');
            $createdBy = $request->input('created_by');
            
            $from = Carbon::parse($fromDate)->startOfDay();
            $to = Carbon::parse($toDate)->endOfDay();
            
            if ($from->greaterThan($to)) {
                return response()->json([
                    'success' => false,
                    'message' => 'From date cannot be greater than To date'
                ], 422);
            }

            Log::info('Daily Closing - Sales accessed', [
                'user_id' => $this->getAuthUserId(),
                'is_admin' => $this->isAdminUser(),
                'from_date' => $fromDate,
                'to_date' => $toDate
            ]);

            $salesData = $this->fetchSalesClosingData($from, $to, $paymentModeId, $createdBy);
            $summary = $this->calculateSalesSummary($salesData);
            $paymentBreakdown = $this->getPaymentMethodBreakdown($from, $to, $paymentModeId, $createdBy, self::MODULE_SALES);
            $ledgerBreakdown = $this->getLedgerBreakdown($from, $to, $paymentModeId, $createdBy, self::INV_TYPE_SALES);

            return response()->json([
                'success' => true,
                'data' => [
                    'transactions' => $salesData,
                    'summary' => $summary,
                    'payment_breakdown' => $paymentBreakdown,
                    'ledger_breakdown' => $ledgerBreakdown,
                    'filters' => [
                        'from_date' => $fromDate,
                        'to_date' => $toDate,
                        'payment_mode_id' => $paymentModeId,
                        'created_by' => $createdBy
                    ],
                    'access_info' => [
                        'is_full_access' => $this->isAdminUser(),
                        'user_type' => auth()->user()->user_type ?? 'unknown'
                    ]
                ]
            ]);

        } catch (\Exception $e) {
            Log::error('Daily Closing - Sales Error', [
                'error' => $e->getMessage(),
                'trace' => $e->getTraceAsString()
            ]);

            return response()->json([
                'success' => false,
                'message' => 'Failed to fetch daily closing data: ' . $e->getMessage()
            ], 500);
        }
    }

    /**
     * Get daily closing report for Donation module
     */
    public function getDonationClosing(Request $request)
    {
        try {
            $fromDate = $request->input('from_date', Carbon::today()->format('Y-m-d'));
            $toDate = $request->input('to_date', Carbon::today()->format('Y-m-d'));
            $paymentModeId = $request->input('payment_mode_id');
            $createdBy = $request->input('created_by');
            
            $from = Carbon::parse($fromDate)->startOfDay();
            $to = Carbon::parse($toDate)->endOfDay();
            
            if ($from->greaterThan($to)) {
                return response()->json([
                    'success' => false,
                    'message' => 'From date cannot be greater than To date'
                ], 422);
            }

            Log::info('Daily Closing - Donation accessed', [
                'user_id' => $this->getAuthUserId(),
                'is_admin' => $this->isAdminUser(),
                'from_date' => $fromDate,
                'to_date' => $toDate
            ]);

            $donationData = $this->fetchDonationClosingData($from, $to, $paymentModeId, $createdBy);
            $summary = $this->calculateDonationSummary($donationData);
            $paymentBreakdown = $this->getPaymentMethodBreakdown($from, $to, $paymentModeId, $createdBy, self::MODULE_DONATION);
            $typeBreakdown = $this->getDonationTypeBreakdown($from, $to, $paymentModeId, $createdBy);

            return response()->json([
                'success' => true,
                'data' => [
                    'transactions' => $donationData,
                    'summary' => $summary,
                    'payment_breakdown' => $paymentBreakdown,
                    'type_breakdown' => $typeBreakdown,
                    'filters' => [
                        'from_date' => $fromDate,
                        'to_date' => $toDate,
                        'payment_mode_id' => $paymentModeId,
                        'created_by' => $createdBy
                    ],
                    'access_info' => [
                        'is_full_access' => $this->isAdminUser(),
                        'user_type' => auth()->user()->user_type ?? 'unknown'
                    ]
                ]
            ]);

        } catch (\Exception $e) {
            Log::error('Daily Closing - Donation Error', [
                'error' => $e->getMessage(),
                'trace' => $e->getTraceAsString()
            ]);

            return response()->json([
                'success' => false,
                'message' => 'Failed to fetch Donation closing data: ' . $e->getMessage()
            ], 500);
        }
    }

    /**
     * Fetch Donation closing data
     */
    private function fetchDonationClosingData($fromDate, $toDate, $paymentModeId = null, $createdBy = null)
    {
        $query = DB::table('bookings as b')
            ->leftJoin('booking_payments as bp', 'b.id', '=', 'bp.booking_id')
            ->leftJoin('payment_modes as pm', 'bp.payment_mode_id', '=', 'pm.id')
            ->leftJoin('users as u', 'b.created_by', '=', 'u.id')
            ->where('b.booking_type', self::MODULE_DONATION)
            ->where('b.account_migration', 1)
            ->whereBetween('b.booking_date', [$fromDate, $toDate])
            ->whereIn('b.booking_status', ['CONFIRMED', 'COMPLETED'])
            ->select([
                'b.id as booking_id',
                'b.booking_number',
                'b.booking_date',
                'b.booking_status',
                'b.payment_status',
                'b.total_amount',
                'b.paid_amount',
                'b.discount_amount',
                'b.booking_through',
                'b.created_by',
                'b.created_at as booking_created_at',
                'bp.id as payment_id',
                'bp.payment_reference',
                'bp.payment_method',
                'bp.amount as payment_amount',
                'bp.payment_date',
                'bp.paid_through',
                'pm.id as payment_mode_id',
                'pm.name as payment_mode_name',
                'u.id as user_id',
                'u.name as created_by_name',
                'u.username as created_by_username'
            ]);

        // Role-based filtering
        if (!$this->isAdminUser()) {
            $currentUserId = $this->getAuthUserId();
            if ($currentUserId) {
                $query->where(function($q) use ($currentUserId) {
                    $q->where('b.user_id', $currentUserId)
                      ->orWhere('b.created_by', $currentUserId);
                });
            }
        }

        if ($paymentModeId) {
            $query->where('bp.payment_mode_id', $paymentModeId);
        }

        if ($createdBy) {
            $query->where('b.created_by', $createdBy);
        }

        $results = $query->orderBy('b.booking_date', 'desc')
            ->orderBy('b.booking_number', 'desc')
            ->get();

        $enrichedResults = [];
        foreach ($results as $result) {
            $meta = $this->getDonationMeta($result->booking_id);
            $devoteeInfo = $this->getDevoteeInfo($result->booking_id);
            
            $enrichedResults[] = [
                'booking_id' => $result->booking_id,
                'booking_number' => $result->booking_number,
                'booking_date' => $result->booking_date,
                'booking_status' => $result->booking_status,
                'payment_status' => $result->payment_status,
                'total_amount' => (float) $result->total_amount,
                'paid_amount' => (float) $result->paid_amount,
                'discount_amount' => (float) $result->discount_amount,
                'booking_through' => $result->booking_through,
                'payment_reference' => $result->payment_reference,
                'payment_method' => $result->payment_method,
                'payment_mode_id' => $result->payment_mode_id,
                'payment_mode_name' => $result->payment_mode_name,
                'payment_amount' => (float) $result->payment_amount,
                'payment_date' => $result->payment_date,
                'paid_through' => $result->paid_through,
                'created_by' => [
                    'id' => $result->user_id,
                    'name' => $result->created_by_name ?? $result->created_by_username,
                ],
                'created_at' => $result->booking_created_at,
                'meta' => $meta,
                'devotee' => $devoteeInfo
            ];
        }

        return $enrichedResults;
    }

    /**
     * Get Donation meta data
     */
    private function getDonationMeta($bookingId)
    {
        $meta = DB::table('booking_meta')
            ->where('booking_id', $bookingId)
            ->whereIn('meta_key', [
                'donation_id',
                'donation_name',
                'donation_type',
                'is_pledge',
                'pledge_amount',
                'pledge_balance',
                'pledge_status',
                'is_anonymous',
                'name_primary',
                'name_secondary',
                'nric',
                'email',
                'phone_no'
            ])
            ->pluck('meta_value', 'meta_key');

        return [
            'donation_id' => $meta['donation_id'] ?? null,
            'donation_name' => $meta['donation_name'] ?? null,
            'donation_type' => $meta['donation_type'] ?? null,
            'is_pledge' => ($meta['is_pledge'] ?? 'false') === 'true',
            'pledge_amount' => isset($meta['pledge_amount']) ? (float) $meta['pledge_amount'] : 0,
            'pledge_balance' => isset($meta['pledge_balance']) ? (float) $meta['pledge_balance'] : 0,
            'pledge_status' => $meta['pledge_status'] ?? null,
            'is_anonymous' => ($meta['is_anonymous'] ?? 'false') === 'true',
            'name_primary' => $meta['name_primary'] ?? null,
            'name_secondary' => $meta['name_secondary'] ?? null
        ];
    }

    /**
     * Calculate Donation summary
     */
    private function calculateDonationSummary($donationData)
    {
        $totalTransactions = count($donationData);
        $totalAmount = 0;
        $totalPaid = 0;
        $totalPledgeAmount = 0;
        $totalPledgeBalance = 0;
        $pledgeCount = 0;
        $anonymousCount = 0;
        $anonymousAmount = 0;

        foreach ($donationData as $donation) {
            $totalAmount += $donation['total_amount'];
            $totalPaid += $donation['paid_amount'];
            
            $meta = $donation['meta'] ?? [];
            
            if (!empty($meta['is_pledge'])) {
                $pledgeCount++;
                $totalPledgeAmount += $meta['pledge_amount'] ?? 0;
                $totalPledgeBalance += $meta['pledge_balance'] ?? 0;
            }
            
            if (!empty($meta['is_anonymous'])) {
                $anonymousCount++;
                $anonymousAmount += $donation['total_amount'];
            }
        }

        return [
            'total_transactions' => $totalTransactions,
            'total_amount' => round($totalAmount, 2),
            'total_paid' => round($totalPaid, 2),
            'outstanding' => round($totalAmount - $totalPaid, 2),
            'pledge_count' => $pledgeCount,
            'total_pledge_amount' => round($totalPledgeAmount, 2),
            'total_pledge_balance' => round($totalPledgeBalance, 2),
            'anonymous_count' => $anonymousCount,
            'anonymous_amount' => round($anonymousAmount, 2)
        ];
    }

    /**
     * Get Donation type breakdown
     */
    private function getDonationTypeBreakdown($fromDate, $toDate, $paymentModeId = null, $createdBy = null)
    {
        $query = DB::table('bookings as b')
            ->leftJoin('booking_meta as bm', function($join) {
                $join->on('b.id', '=', 'bm.booking_id')
                     ->where('bm.meta_key', '=', 'donation_name');
            })
            ->where('b.booking_type', self::MODULE_DONATION)
            ->where('b.account_migration', 1)
            ->whereBetween('b.booking_date', [$fromDate, $toDate])
            ->whereIn('b.booking_status', ['CONFIRMED', 'COMPLETED']);

        // Role-based filtering
        if (!$this->isAdminUser()) {
            $currentUserId = $this->getAuthUserId();
            if ($currentUserId) {
                $query->where(function($q) use ($currentUserId) {
                    $q->where('b.user_id', $currentUserId)
                      ->orWhere('b.created_by', $currentUserId);
                });
            }
        }

        if ($paymentModeId) {
            $query->join('booking_payments as bp', 'b.id', '=', 'bp.booking_id')
                  ->where('bp.payment_mode_id', $paymentModeId);
        }

        if ($createdBy) {
            $query->where('b.created_by', $createdBy);
        }

        return $query->select([
                DB::raw("COALESCE(bm.meta_value, 'General Donation') as donation_type"),
                DB::raw('COUNT(*) as transaction_count'),
                DB::raw('SUM(b.total_amount) as total_amount'),
                DB::raw('SUM(b.paid_amount) as paid_amount')
            ])
            ->groupBy('bm.meta_value')
            ->orderBy('total_amount', 'desc')
            ->get()
            ->map(function($item) {
                return [
                    'donation_type' => $item->donation_type,
                    'transaction_count' => (int) $item->transaction_count,
                    'total_amount' => round((float) $item->total_amount, 2),
                    'paid_amount' => round((float) $item->paid_amount, 2)
                ];
            })
            ->toArray();
    }

    /**
     * Get daily closing report for Buddha Lamp module
     */
    public function getBuddhaLampClosing(Request $request)
    {
        try {
            $fromDate = $request->input('from_date', Carbon::today()->format('Y-m-d'));
            $toDate = $request->input('to_date', Carbon::today()->format('Y-m-d'));
            $paymentModeId = $request->input('payment_mode_id');
            $createdBy = $request->input('created_by');
            
            $from = Carbon::parse($fromDate)->startOfDay();
            $to = Carbon::parse($toDate)->endOfDay();
            
            if ($from->greaterThan($to)) {
                return response()->json([
                    'success' => false,
                    'message' => 'From date cannot be greater than To date'
                ], 422);
            }

            Log::info('Daily Closing - Buddha Lamp accessed', [
                'user_id' => $this->getAuthUserId(),
                'from_date' => $fromDate,
                'to_date' => $toDate
            ]);

            $buddhaLampData = $this->fetchBuddhaLampClosingData($from, $to, $paymentModeId, $createdBy);
            $summary = $this->calculateBuddhaLampSummary($buddhaLampData);
            $paymentBreakdown = $this->getPaymentMethodBreakdown($from, $to, $paymentModeId, $createdBy, self::MODULE_BUDDHA_LAMP);
            $typeBreakdown = $this->getBuddhaLampTypeBreakdown($from, $to, $paymentModeId, $createdBy);

            return response()->json([
                'success' => true,
                'data' => [
                    'transactions' => $buddhaLampData,
                    'summary' => $summary,
                    'payment_breakdown' => $paymentBreakdown,
                    'type_breakdown' => $typeBreakdown,
                    'filters' => [
                        'from_date' => $fromDate,
                        'to_date' => $toDate,
                        'payment_mode_id' => $paymentModeId,
                        'created_by' => $createdBy
                    ],
                    'access_info' => [
                        'is_full_access' => $this->isAdminUser(),
                        'user_type' => auth()->user()->user_type ?? 'unknown'
                    ]
                ]
            ]);

        } catch (\Exception $e) {
            Log::error('Daily Closing - Buddha Lamp Error', [
                'error' => $e->getMessage(),
                'trace' => $e->getTraceAsString()
            ]);

            return response()->json([
                'success' => false,
                'message' => 'Failed to fetch Buddha Lamp closing data: ' . $e->getMessage()
            ], 500);
        }
    }

    /**
     * Get daily closing report for Temple Events (Special Occasions) module
     * FIXED: Now includes 'SPECIAL_OCCASIONS' booking type
     */
    public function getTempleEventsClosing(Request $request)
    {
        try {
            $fromDate = $request->input('from_date', Carbon::today()->format('Y-m-d'));
            $toDate = $request->input('to_date', Carbon::today()->format('Y-m-d'));
            $paymentModeId = $request->input('payment_mode_id');
            $createdBy = $request->input('created_by');
            
            $from = Carbon::parse($fromDate)->startOfDay();
            $to = Carbon::parse($toDate)->endOfDay();
            
            if ($from->greaterThan($to)) {
                return response()->json([
                    'success' => false,
                    'message' => 'From date cannot be greater than To date'
                ], 422);
            }

            Log::info('Daily Closing - Temple Events accessed', [
                'user_id' => $this->getAuthUserId(),
                'is_admin' => $this->isAdminUser(),
                'from_date' => $fromDate,
                'to_date' => $toDate
            ]);

            $templeEventsData = $this->fetchTempleEventsClosingData($from, $to, $paymentModeId, $createdBy);
            $summary = $this->calculateTempleEventsSummary($templeEventsData);
            $paymentBreakdown = $this->getTempleEventsPaymentBreakdown($from, $to, $paymentModeId, $createdBy);
            $occasionBreakdown = $this->getOccasionBreakdown($from, $to, $paymentModeId, $createdBy);
            $serviceBreakdown = $this->getServiceBreakdown($from, $to, $paymentModeId, $createdBy);

            return response()->json([
                'success' => true,
                'data' => [
                    'transactions' => $templeEventsData,
                    'summary' => $summary,
                    'payment_breakdown' => $paymentBreakdown,
                    'occasion_breakdown' => $occasionBreakdown,
                    'service_breakdown' => $serviceBreakdown,
                    'filters' => [
                        'from_date' => $fromDate,
                        'to_date' => $toDate,
                        'payment_mode_id' => $paymentModeId,
                        'created_by' => $createdBy
                    ],
                    'access_info' => [
                        'is_full_access' => $this->isAdminUser(),
                        'user_type' => auth()->user()->user_type ?? 'unknown'
                    ]
                ]
            ]);

        } catch (\Exception $e) {
            Log::error('Daily Closing - Temple Events Error', [
                'error' => $e->getMessage(),
                'trace' => $e->getTraceAsString()
            ]);

            return response()->json([
                'success' => false,
                'message' => 'Failed to fetch Temple Events closing data: ' . $e->getMessage()
            ], 500);
        }
    }

    /**
     * Get all valid Temple Events booking types
     * FIXED: Includes 'SPECIAL_OCCASIONS' which is used by SpecialOccasionBookingController
     */
    private function getTempleEventBookingTypes()
    {
        return [
  self::MODULE_SPECIAL_OCCASIONS 
        ];
    }

    /**
     * Fetch Temple Events (Special Occasions) closing data
     * FIXED: Uses getTempleEventBookingTypes() to include all valid types
     */
    private function fetchTempleEventsClosingData($fromDate, $toDate, $paymentModeId = null, $createdBy = null)
    {
        // Get all valid booking types for Temple Events
        $bookingTypes = $this->getTempleEventBookingTypes();
        
        Log::info('Fetching Temple Events data', [
            'booking_types' => $bookingTypes,
            'from_date' => $fromDate,
            'to_date' => $toDate
        ]);

        // Query bookings for Special Occasions / Temple Events
        $query = DB::table('bookings as b')
            ->leftJoin('booking_payments as bp', 'b.id', '=', 'bp.booking_id')
            ->leftJoin('payment_modes as pm', 'bp.payment_mode_id', '=', 'pm.id')
            ->leftJoin('users as u', 'b.created_by', '=', 'u.id')
            ->whereIn('b.booking_type', $bookingTypes)
            ->where('b.account_migration', 1)
            ->whereBetween('b.booking_date', [$fromDate, $toDate])
            ->whereIn('b.booking_status', ['CONFIRMED', 'COMPLETED'])
            ->select([
                'b.id as booking_id',
                'b.booking_number',
                'b.booking_date',
                'b.booking_type',
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
                'b.user_id as booking_user_id',
                'b.created_by',
                'b.created_at as booking_created_at',
                'bp.id as payment_id',
                'bp.payment_reference',
                'bp.payment_method',
                'bp.amount as payment_amount',
                'bp.payment_date',
                'bp.payment_type',
                'bp.payment_status as bp_payment_status',
                'pm.id as payment_mode_id',
                'pm.name as payment_mode_name',
                'u.id as user_id',
                'u.name as created_by_name',
                'u.username as created_by_username'
            ]);

        // Role-based filtering for non-admin users
        if (!$this->isAdminUser()) {
            $currentUserId = $this->getAuthUserId();
            if ($currentUserId) {
                $query->where(function($q) use ($currentUserId) {
                    $q->where('b.user_id', $currentUserId)
                      ->orWhere('b.created_by', $currentUserId);
                });
            }
        }

        // Apply filters
        if ($paymentModeId) {
            $query->where('bp.payment_mode_id', $paymentModeId);
        }

        if ($createdBy) {
            $query->where('b.created_by', $createdBy);
        }

        $results = $query->orderBy('b.booking_date', 'desc')
            ->orderBy('b.booking_number', 'desc')
            ->get();

        Log::info('Temple Events query results', [
            'count' => $results->count()
        ]);

        // Enrich with booking items and meta
        $enrichedResults = [];
        foreach ($results as $result) {
            $bookingItems = $this->getBookingItems($result->booking_id);
            $devoteeInfo = $this->getDevoteeInfo($result->booking_id);
            $occasionInfo = $this->getOccasionInfo($result->booking_id);
            $services = $this->getBookingServices($result->booking_id);
            
            $enrichedResults[] = [
                'booking_id' => $result->booking_id,
                'booking_number' => $result->booking_number,
                'booking_date' => $result->booking_date,
                'booking_type' => $result->booking_type,
                'booking_status' => $result->booking_status,
                'payment_status' => $result->payment_status,
                'subtotal' => (float) $result->subtotal,
                'tax_amount' => (float) $result->tax_amount,
                'discount_amount' => (float) $result->discount_amount,
                'deposit_amount' => (float) $result->deposit_amount,
                'total_amount' => (float) $result->total_amount,
                'paid_amount' => (float) $result->paid_amount,
                'payment_reference' => $result->payment_reference,
                'payment_method' => $result->payment_method,
                'payment_mode_id' => $result->payment_mode_id,
                'payment_mode_name' => $result->payment_mode_name,
                'payment_amount' => (float) $result->payment_amount,
                'payment_date' => $result->payment_date,
                'created_by' => [
                    'id' => $result->user_id,
                    'name' => $result->created_by_name ?? $result->created_by_username,
                ],
                'created_at' => $result->booking_created_at,
                'booking_items' => $bookingItems,
                'devotee' => $devoteeInfo,
                'occasion' => $occasionInfo,
                'services' => $services
            ];
        }

        return $enrichedResults;
    }

    /**
     * Get occasion info from booking meta
     */
    private function getOccasionInfo($bookingId)
    {
        $meta = DB::table('booking_meta')
            ->where('booking_id', $bookingId)
            ->whereIn('meta_key', [
                'occasion_id',
                'occasion_name',
                'occasion_name_secondary',
                'option_id',
                'option_name',
                'event_date',
                'event_time',
                'slot_time',
                'package_name',
                'name_chinese',
                'name_english'
            ])
            ->pluck('meta_value', 'meta_key');

        if ($meta->isEmpty()) {
            return null;
        }

        return [
            'occasion_id' => $meta['occasion_id'] ?? null,
            'occasion_name' => $meta['occasion_name'] ?? null,
            'occasion_name_secondary' => $meta['occasion_name_secondary'] ?? null,
            'option_id' => $meta['option_id'] ?? null,
            'option_name' => $meta['option_name'] ?? null,
            'event_date' => $meta['event_date'] ?? null,
            'event_time' => $meta['event_time'] ?? $meta['slot_time'] ?? null,
            'package_name' => $meta['package_name'] ?? null,
            'name_chinese' => $meta['name_chinese'] ?? null,
            'name_english' => $meta['name_english'] ?? null
        ];
    }

    /**
     * Get booking services
     */
    private function getBookingServices($bookingId)
    {
        return DB::table('booking_items as bi')
            ->where('bi.booking_id', $bookingId)
            ->where('bi.item_type', 'SERVICE')
            ->select([
                'bi.id',
                'bi.item_name',
                'bi.item_name_secondary',
                'bi.quantity',
                'bi.unit_price',
                'bi.total_price',
                'bi.status'
            ])
            ->get()
            ->map(function($item) {
                return [
                    'id' => $item->id,
                    'service_name' => $item->item_name,
                    'service_name_secondary' => $item->item_name_secondary,
                    'quantity' => (int) $item->quantity,
                    'unit_price' => (float) $item->unit_price,
                    'total_price' => (float) $item->total_price,
                    'status' => $item->status
                ];
            })
            ->toArray();
    }

    /**
     * Calculate Temple Events summary
     */
    private function calculateTempleEventsSummary($templeEventsData)
    {
        $totalTransactions = count($templeEventsData);
        $totalAmount = 0;
        $totalDiscount = 0;
        $totalDeposit = 0;
        $totalPaid = 0;
        $totalTax = 0;
        $totalServices = 0;

        foreach ($templeEventsData as $event) {
            $totalAmount += $event['total_amount'];
            $totalDiscount += $event['discount_amount'];
            $totalDeposit += $event['deposit_amount'];
            $totalPaid += $event['paid_amount'];
            $totalTax += $event['tax_amount'];
            $totalServices += count($event['services'] ?? []);
        }

        return [
            'total_transactions' => $totalTransactions,
            'total_services' => $totalServices,
            'total_amount' => round($totalAmount, 2),
            'total_discount' => round($totalDiscount, 2),
            'total_deposit' => round($totalDeposit, 2),
            'total_paid' => round($totalPaid, 2),
            'total_tax' => round($totalTax, 2),
            'net_amount' => round($totalAmount - $totalDiscount, 2),
            'outstanding' => round($totalAmount - $totalPaid, 2)
        ];
    }

    /**
     * Get Temple Events payment method breakdown
     * FIXED: Uses getTempleEventBookingTypes()
     */
    private function getTempleEventsPaymentBreakdown($fromDate, $toDate, $paymentModeId = null, $createdBy = null)
    {
        $bookingTypes = $this->getTempleEventBookingTypes();
        
        $query = DB::table('bookings as b')
            ->join('booking_payments as bp', 'b.id', '=', 'bp.booking_id')
            ->join('payment_modes as pm', 'bp.payment_mode_id', '=', 'pm.id')
            ->where('b.account_migration', 1)
            ->whereBetween('b.booking_date', [$fromDate, $toDate])
            ->whereIn('b.booking_status', ['CONFIRMED', 'COMPLETED'])
            ->whereIn('b.booking_type', $bookingTypes);

        // Role-based filtering
        if (!$this->isAdminUser()) {
            $currentUserId = $this->getAuthUserId();
            if ($currentUserId) {
                $query->where(function($q) use ($currentUserId) {
                    $q->where('b.user_id', $currentUserId)
                      ->orWhere('b.created_by', $currentUserId);
                });
            }
        }

        if ($paymentModeId) {
            $query->where('bp.payment_mode_id', $paymentModeId);
        }

        if ($createdBy) {
            $query->where('b.created_by', $createdBy);
        }

        return $query->select([
                'pm.id',
                'pm.name',
                DB::raw('COUNT(*) as transaction_count'),
                DB::raw('SUM(bp.amount) as total_amount')
            ])
            ->groupBy('pm.id', 'pm.name')
            ->orderBy('total_amount', 'desc')
            ->get()
            ->map(function($item) {
                return [
                    'payment_mode_id' => $item->id,
                    'payment_mode_name' => $item->name,
                    'transaction_count' => (int) $item->transaction_count,
                    'total_amount' => round((float) $item->total_amount, 2)
                ];
            })
            ->toArray();
    }

    /**
     * Get occasion type breakdown
     * FIXED: Uses getTempleEventBookingTypes()
     */
    private function getOccasionBreakdown($fromDate, $toDate, $paymentModeId = null, $createdBy = null)
    {
        $bookingTypes = $this->getTempleEventBookingTypes();
        
        $query = DB::table('bookings as b')
            ->leftJoin('booking_items as bi', function($join) {
                $join->on('b.id', '=', 'bi.booking_id')
                     ->where('bi.add_ons', '=', 0); // Only main booking items
            })
            ->whereIn('b.booking_type', $bookingTypes)
            ->where('b.account_migration', 1)
            ->whereBetween('b.booking_date', [$fromDate, $toDate])
            ->whereIn('b.booking_status', ['CONFIRMED', 'COMPLETED']);

        // Role-based filtering
        if (!$this->isAdminUser()) {
            $currentUserId = $this->getAuthUserId();
            if ($currentUserId) {
                $query->where(function($q) use ($currentUserId) {
                    $q->where('b.user_id', $currentUserId)
                      ->orWhere('b.created_by', $currentUserId);
                });
            }
        }

        if ($paymentModeId) {
            $query->join('booking_payments as bp', 'b.id', '=', 'bp.booking_id')
                  ->where('bp.payment_mode_id', $paymentModeId);
        }

        if ($createdBy) {
            $query->where('b.created_by', $createdBy);
        }

        return $query->select([
                DB::raw("COALESCE(bi.item_name, 'Unknown Occasion') as occasion_name"),
                DB::raw('COUNT(DISTINCT b.id) as transaction_count'),
                DB::raw('SUM(b.total_amount) as total_amount'),
                DB::raw('SUM(b.paid_amount) as paid_amount')
            ])
            ->groupBy('bi.item_name')
            ->orderBy('total_amount', 'desc')
            ->get()
            ->map(function($item) {
                return [
                    'occasion_name' => $item->occasion_name,
                    'transaction_count' => (int) $item->transaction_count,
                    'total_amount' => round((float) $item->total_amount, 2),
                    'paid_amount' => round((float) $item->paid_amount, 2)
                ];
            })
            ->toArray();
    }

    /**
     * Get service breakdown for Temple Events
     * FIXED: Uses getTempleEventBookingTypes()
     */
    private function getServiceBreakdown($fromDate, $toDate, $paymentModeId = null, $createdBy = null)
    {
        $bookingTypes = $this->getTempleEventBookingTypes();
        
        $query = DB::table('bookings as b')
            ->join('booking_items as bi', 'b.id', '=', 'bi.booking_id')
            ->whereIn('b.booking_type', $bookingTypes)
            ->where('b.account_migration', 1)
            ->whereBetween('b.booking_date', [$fromDate, $toDate])
            ->whereIn('b.booking_status', ['CONFIRMED', 'COMPLETED']);

        // Role-based filtering
        if (!$this->isAdminUser()) {
            $currentUserId = $this->getAuthUserId();
            if ($currentUserId) {
                $query->where(function($q) use ($currentUserId) {
                    $q->where('b.user_id', $currentUserId)
                      ->orWhere('b.created_by', $currentUserId);
                });
            }
        }

        if ($paymentModeId) {
            $query->join('booking_payments as bp', 'b.id', '=', 'bp.booking_id')
                  ->where('bp.payment_mode_id', $paymentModeId);
        }

        if ($createdBy) {
            $query->where('b.created_by', $createdBy);
        }

        return $query->select([
                'bi.item_name as service_name',
                'bi.item_name_secondary as service_name_secondary',
                DB::raw('SUM(bi.quantity) as total_quantity'),
                DB::raw('SUM(bi.total_price) as total_amount')
            ])
            ->groupBy('bi.item_name', 'bi.item_name_secondary')
            ->orderBy('total_amount', 'desc')
            ->get()
            ->map(function($item) {
                return [
                    'service_name' => $item->service_name,
                    'service_name_secondary' => $item->service_name_secondary,
                    'total_quantity' => (int) $item->total_quantity,
                    'total_amount' => round((float) $item->total_amount, 2)
                ];
            })
            ->toArray();
    }

    /**
     * Fetch Buddha Lamp closing data
     */
    private function fetchBuddhaLampClosingData($fromDate, $toDate, $paymentModeId = null, $createdBy = null)
    {
        $query = DB::table('bookings as b')
            ->leftJoin('booking_payments as bp', 'b.id', '=', 'bp.booking_id')
            ->leftJoin('payment_modes as pm', 'bp.payment_mode_id', '=', 'pm.id')
            ->leftJoin('users as u', 'b.created_by', '=', 'u.id')
            ->where('b.booking_type', self::MODULE_BUDDHA_LAMP)
            ->where('b.account_migration', 1)
            ->whereBetween('b.booking_date', [$fromDate, $toDate])
            ->whereIn('b.booking_status', ['CONFIRMED', 'COMPLETED'])
            ->select([
                'b.id as booking_id',
                'b.booking_number',
                'b.booking_date',
                'b.booking_status',
                'b.payment_status',
                'b.total_amount',
                'b.paid_amount',
                'b.discount_amount',
                'b.created_by',
                'b.created_at as booking_created_at',
                'bp.payment_reference',
                'bp.payment_method',
                'bp.amount as payment_amount',
                'bp.payment_date',
                'pm.id as payment_mode_id',
                'pm.name as payment_mode_name',
                'u.id as user_id',
                'u.name as created_by_name',
                'u.username as created_by_username'
            ]);

        // Role-based filtering
        if (!$this->isAdminUser()) {
            $currentUserId = $this->getAuthUserId();
            if ($currentUserId) {
                $query->where(function($q) use ($currentUserId) {
                    $q->where('b.user_id', $currentUserId)
                      ->orWhere('b.created_by', $currentUserId);
                });
            }
        }

        if ($paymentModeId) {
            $query->where('bp.payment_mode_id', $paymentModeId);
        }

        if ($createdBy) {
            $query->where('b.created_by', $createdBy);
        }

        $results = $query->orderBy('b.booking_date', 'desc')
            ->orderBy('b.booking_number', 'desc')
            ->get();

        $enrichedResults = [];
        foreach ($results as $result) {
            $meta = $this->getBuddhaLampMeta($result->booking_id);
            
            $enrichedResults[] = [
                'booking_id' => $result->booking_id,
                'booking_number' => $result->booking_number,
                'booking_date' => $result->booking_date,
                'booking_status' => $result->booking_status,
                'payment_status' => $result->payment_status,
                'total_amount' => (float) $result->total_amount,
                'paid_amount' => (float) $result->paid_amount,
                'discount_amount' => (float) $result->discount_amount,
                'payment_reference' => $result->payment_reference,
                'payment_method' => $result->payment_method,
                'payment_mode_id' => $result->payment_mode_id,
                'payment_mode_name' => $result->payment_mode_name,
                'payment_amount' => (float) $result->payment_amount,
                'payment_date' => $result->payment_date,
                'created_by' => [
                    'id' => $result->user_id,
                    'name' => $result->created_by_name ?? $result->created_by_username,
                ],
                'created_at' => $result->booking_created_at,
                'meta' => $meta
            ];
        }

        return $enrichedResults;
    }

    /**
     * Get Buddha Lamp meta data
     */
    private function getBuddhaLampMeta($bookingId)
    {
        $meta = DB::table('booking_meta')
            ->where('booking_id', $bookingId)
            ->whereIn('meta_key', [
                'buddha_lamp_master_id',
                'buddha_lamp_name',
                'name_primary',
                'name_secondary',
                'nric',
                'email',
                'phone_no'
            ])
            ->pluck('meta_value', 'meta_key');

        return [
            'buddha_lamp_master_id' => $meta['buddha_lamp_master_id'] ?? null,
            'buddha_lamp_name' => $meta['buddha_lamp_name'] ?? null,
            'name_primary' => $meta['name_primary'] ?? null,
            'name_secondary' => $meta['name_secondary'] ?? null,
            'nric' => $meta['nric'] ?? null,
            'email' => $meta['email'] ?? null,
            'phone_no' => $meta['phone_no'] ?? null
        ];
    }

    /**
     * Calculate Buddha Lamp summary
     */
    private function calculateBuddhaLampSummary($buddhaLampData)
    {
        $totalTransactions = count($buddhaLampData);
        $totalAmount = 0;
        $totalPaid = 0;

        foreach ($buddhaLampData as $lamp) {
            $totalAmount += $lamp['total_amount'];
            $totalPaid += $lamp['paid_amount'];
        }

        return [
            'total_transactions' => $totalTransactions,
            'total_amount' => round($totalAmount, 2),
            'total_paid' => round($totalPaid, 2),
            'outstanding' => round($totalAmount - $totalPaid, 2)
        ];
    }

    /**
     * Get Buddha Lamp type breakdown
     */
    private function getBuddhaLampTypeBreakdown($fromDate, $toDate, $paymentModeId = null, $createdBy = null)
    {
        $query = DB::table('bookings as b')
            ->leftJoin('booking_meta as bm', function($join) {
                $join->on('b.id', '=', 'bm.booking_id')
                     ->where('bm.meta_key', '=', 'buddha_lamp_name');
            })
            ->where('b.booking_type', self::MODULE_BUDDHA_LAMP)
            ->where('b.account_migration', 1)
            ->whereBetween('b.booking_date', [$fromDate, $toDate])
            ->whereIn('b.booking_status', ['CONFIRMED', 'COMPLETED']);

        // Role-based filtering
        if (!$this->isAdminUser()) {
            $currentUserId = $this->getAuthUserId();
            if ($currentUserId) {
                $query->where(function($q) use ($currentUserId) {
                    $q->where('b.user_id', $currentUserId)
                      ->orWhere('b.created_by', $currentUserId);
                });
            }
        }

        if ($paymentModeId) {
            $query->join('booking_payments as bp', 'b.id', '=', 'bp.booking_id')
                  ->where('bp.payment_mode_id', $paymentModeId);
        }

        if ($createdBy) {
            $query->where('b.created_by', $createdBy);
        }

        return $query->select([
                DB::raw("COALESCE(bm.meta_value, 'Custom Amount') as lamp_type"),
                DB::raw('COUNT(*) as transaction_count'),
                DB::raw('SUM(b.total_amount) as total_amount')
            ])
            ->groupBy('bm.meta_value')
            ->orderBy('total_amount', 'desc')
            ->get()
            ->map(function($item) {
                return [
                    'lamp_type' => $item->lamp_type,
                    'transaction_count' => (int) $item->transaction_count,
                    'total_amount' => round((float) $item->total_amount, 2)
                ];
            })
            ->toArray();
    }

    /**
     * Fetch sales closing data from entries and entryitems tables
     */
    private function fetchSalesClosingData($fromDate, $toDate, $paymentModeId = null, $createdBy = null)
    {
        $query = DB::table('entries as e')
            ->join('bookings as b', function($join) {
                $join->on('e.inv_id', '=', DB::raw('b.id::text'))
                    ->where('e.inv_type', '=', self::INV_TYPE_SALES);
            })
            ->leftJoin('booking_payments as bp', 'b.id', '=', 'bp.booking_id')
            ->leftJoin('payment_modes as pm', 'bp.payment_mode_id', '=', 'pm.id')
            ->leftJoin('users as u', 'b.created_by', '=', 'u.id')
            ->where('b.booking_type', self::MODULE_SALES)
            ->where('b.account_migration', 1)
            ->whereBetween('e.date', [$fromDate, $toDate])
            ->select([
                'e.id as entry_id',
                'e.entry_code',
                'e.number as voucher_number',
                'e.date as entry_date',
                'e.dr_total',
                'e.cr_total',
                'e.narration',
                'e.user_id as entry_user_id',
                'b.id as booking_id',
                'b.booking_number',
                'b.booking_date',
                'b.total_amount',
                'b.paid_amount',
                'b.discount_amount',
                'b.deposit_amount',
                'b.booking_status',
                'b.payment_status',
                'b.print_option',
                'b.user_id as booking_user_id',
                'b.created_by',
                'b.created_at as booking_created_at',
                'bp.payment_reference',
                'bp.payment_method',
                'bp.amount as payment_amount',
                'bp.payment_date',
                'pm.id as payment_mode_id',
                'pm.name as payment_mode_name',
                'u.id as user_id',
                'u.name as created_by_name',
                'u.username as created_by_username'
            ]);

        // Role-based filtering
        if (!$this->isAdminUser()) {
            $currentUserId = $this->getAuthUserId();
            if ($currentUserId) {
                $query->where(function($q) use ($currentUserId) {
                    $q->where('b.user_id', $currentUserId)
                      ->orWhere('b.created_by', $currentUserId)
                      ->orWhere('e.user_id', $currentUserId);
                });
            }
        }

        if ($paymentModeId) {
            $query->where('bp.payment_mode_id', $paymentModeId);
        }

        if ($createdBy) {
            $query->where('b.created_by', $createdBy);
        }

        $results = $query->orderBy('e.date', 'desc')
            ->orderBy('e.entry_code', 'desc')
            ->get();

        $enrichedResults = [];
        foreach ($results as $result) {
            $entryItems = $this->getEntryItems($result->entry_id);
            $bookingItems = $this->getBookingItems($result->booking_id);
            $devoteeInfo = $this->getDevoteeInfo($result->booking_id);
            
            $enrichedResults[] = [
                'entry_id' => $result->entry_id,
                'entry_code' => $result->entry_code,
                'voucher_number' => $result->voucher_number,
                'entry_date' => $result->entry_date,
                'dr_total' => (float) $result->dr_total,
                'cr_total' => (float) $result->cr_total,
                'narration' => $result->narration,
                'booking_id' => $result->booking_id,
                'booking_number' => $result->booking_number,
                'booking_date' => $result->booking_date,
                'total_amount' => (float) $result->total_amount,
                'paid_amount' => (float) $result->paid_amount,
                'discount_amount' => (float) $result->discount_amount,
                'deposit_amount' => (float) $result->deposit_amount,
                'booking_status' => $result->booking_status,
                'payment_status' => $result->payment_status,
                'payment_reference' => $result->payment_reference,
                'payment_method' => $result->payment_method,
                'payment_mode_id' => $result->payment_mode_id,
                'payment_mode_name' => $result->payment_mode_name,
                'payment_amount' => (float) $result->payment_amount,
                'payment_date' => $result->payment_date,
                'created_by' => [
                    'id' => $result->user_id,
                    'name' => $result->created_by_name ?? $result->created_by_username,
                ],
                'created_at' => $result->booking_created_at,
                'entry_items' => $entryItems,
                'booking_items' => $bookingItems,
                'devotee' => $devoteeInfo
            ];
        }

        return $enrichedResults;
    }

    /**
     * Get entry items (ledger details) for an entry
     */
    private function getEntryItems($entryId)
    {
        return DB::table('entryitems as ei')
            ->leftJoin('ledgers as l', 'ei.ledger_id', '=', DB::raw('l.id::text'))
            ->leftJoin('groups as g', 'l.group_id', '=', 'g.id')
            ->where('ei.entry_id', $entryId)
            ->select([
                'ei.id',
                'ei.ledger_id',
                'l.name as ledger_name',
                'l.left_code',
                'l.right_code',
                'g.name as group_name',
                'g.code as group_code',
                'ei.amount',
                'ei.dc',
                'ei.details',
                'ei.narration'
            ])
            ->get()
            ->map(function($item) {
                return [
                    'id' => $item->id,
                    'ledger_id' => $item->ledger_id,
                    'ledger_name' => $item->ledger_name,
                    'ledger_code' => $item->left_code . '-' . $item->right_code,
                    'group_name' => $item->group_name,
                    'group_code' => $item->group_code,
                    'amount' => (float) $item->amount,
                    'dc' => $item->dc,
                    'dc_label' => $item->dc === 'D' ? 'Debit' : 'Credit',
                    'details' => $item->details,
                    'narration' => $item->narration
                ];
            })
            ->toArray();
    }

    /**
     * Get booking items for a booking
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
                'd.name as deity_name',
                'd.name_secondary as deity_name_secondary'
            ])
            ->get()
            ->map(function($item) {
                return [
                    'id' => $item->id,
                    'item_type' => $item->item_type,
                    'item_name' => $item->item_name,
                    'item_name_secondary' => $item->item_name_secondary,
                    'short_code' => $item->short_code,
                    'quantity' => (int) $item->quantity,
                    'unit_price' => (float) $item->unit_price,
                    'total_price' => (float) $item->total_price,
                    'status' => $item->status,
                    'deity_name' => $item->deity_name,
                    'deity_name_secondary' => $item->deity_name_secondary
                ];
            })
            ->toArray();
    }

    /**
     * Get devotee info from booking meta
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
            'name_secondary' => $meta['name_secondary'] ?? $meta['name_chinese'] ?? null,
            'email' => $meta['devotee_email'] ?? $meta['email'] ?? null,
            'nric' => $meta['devotee_nric'] ?? $meta['nric'] ?? null,
            'phone' => ($meta['devotee_phone_code'] ?? '') . ' ' . ($meta['devotee_phone'] ?? $meta['phone_no'] ?? $meta['contact_no'] ?? '')
        ];
    }

    /**
     * Calculate sales summary
     */
    private function calculateSalesSummary($salesData)
    {
        $totalTransactions = count($salesData);
        $totalSales = 0;
        $totalDiscount = 0;
        $totalDeposit = 0;
        $totalPaid = 0;
        $totalDebit = 0;
        $totalCredit = 0;
        $totalItems = 0;

        foreach ($salesData as $sale) {
            $totalSales += $sale['total_amount'];
            $totalDiscount += $sale['discount_amount'];
            $totalDeposit += $sale['deposit_amount'];
            $totalPaid += $sale['paid_amount'];
            $totalDebit += $sale['dr_total'];
            $totalCredit += $sale['cr_total'];
            
            foreach ($sale['booking_items'] as $item) {
                $totalItems += $item['quantity'];
            }
        }

        return [
            'total_transactions' => $totalTransactions,
            'total_items' => $totalItems,
            'total_sales' => round($totalSales, 2),
            'total_discount' => round($totalDiscount, 2),
            'total_deposit' => round($totalDeposit, 2),
            'total_paid' => round($totalPaid, 2),
            'total_debit' => round($totalDebit, 2),
            'total_credit' => round($totalCredit, 2),
            'net_sales' => round($totalSales - $totalDiscount, 2)
        ];
    }

    /**
     * Get payment method breakdown
     */
    private function getPaymentMethodBreakdown($fromDate, $toDate, $paymentModeId = null, $createdBy = null, $moduleType = null)
    {
        $query = DB::table('bookings as b')
            ->join('booking_payments as bp', 'b.id', '=', 'bp.booking_id')
            ->join('payment_modes as pm', 'bp.payment_mode_id', '=', 'pm.id')
            ->where('b.account_migration', 1)
            ->whereBetween('b.booking_date', [$fromDate, $toDate])
            ->whereIn('b.booking_status', ['CONFIRMED', 'COMPLETED']);

        if ($moduleType) {
            // For Temple Events, use the proper booking types
            if ($moduleType === self::MODULE_SPECIAL_OCCASIONS || $moduleType === self::MODULE_SPECIAL_OCCASIONS) {
                $query->whereIn('b.booking_type', $this->getTempleEventBookingTypes());
            } else {
                $query->where('b.booking_type', $moduleType);
            }
        }

        // Role-based filtering
        if (!$this->isAdminUser()) {
            $currentUserId = $this->getAuthUserId();
            if ($currentUserId) {
                $query->where(function($q) use ($currentUserId) {
                    $q->where('b.user_id', $currentUserId)
                      ->orWhere('b.created_by', $currentUserId);
                });
            }
        }

        if ($paymentModeId) {
            $query->where('bp.payment_mode_id', $paymentModeId);
        }

        if ($createdBy) {
            $query->where('b.created_by', $createdBy);
        }

        return $query->select([
                'pm.id',
                'pm.name',
                DB::raw('COUNT(*) as transaction_count'),
                DB::raw('SUM(bp.amount) as total_amount')
            ])
            ->groupBy('pm.id', 'pm.name')
            ->orderBy('total_amount', 'desc')
            ->get()
            ->map(function($item) {
                return [
                    'payment_mode_id' => $item->id,
                    'payment_mode_name' => $item->name,
                    'transaction_count' => (int) $item->transaction_count,
                    'total_amount' => round((float) $item->total_amount, 2)
                ];
            })
            ->toArray();
    }

    /**
     * Get ledger breakdown
     */
    private function getLedgerBreakdown($fromDate, $toDate, $paymentModeId = null, $createdBy = null, $invType = null)
    {
        $query = DB::table('entries as e')
            ->join('entryitems as ei', 'e.id', '=', 'ei.entry_id')
            ->join('ledgers as l', 'ei.ledger_id', '=', DB::raw('l.id::text'))
            ->leftJoin('groups as g', 'l.group_id', '=', 'g.id')
            ->where('ei.dc', 'C')
            ->whereBetween('e.date', [$fromDate, $toDate]);

        if ($invType) {
            $query->where('e.inv_type', $invType);
        }

        // Role-based filtering
        if (!$this->isAdminUser()) {
            $currentUserId = $this->getAuthUserId();
            if ($currentUserId) {
                $query->join('bookings as b', function($join) {
                    $join->on('e.inv_id', '=', DB::raw('b.id::text'));
                })
                ->where(function($q) use ($currentUserId) {
                    $q->where('b.user_id', $currentUserId)
                      ->orWhere('b.created_by', $currentUserId)
                      ->orWhere('e.user_id', $currentUserId);
                });
            }
        }

        return $query->select([
                'l.id as ledger_id',
                'l.name as ledger_name',
                'l.left_code',
                'l.right_code',
                'g.name as group_name',
                DB::raw('COUNT(*) as transaction_count'),
                DB::raw('SUM(ei.amount) as total_amount')
            ])
            ->groupBy('l.id', 'l.name', 'l.left_code', 'l.right_code', 'g.name')
            ->orderBy('total_amount', 'desc')
            ->get()
            ->map(function($item) {
                return [
                    'ledger_id' => $item->ledger_id,
                    'ledger_name' => $item->ledger_name,
                    'ledger_code' => $item->left_code . '-' . $item->right_code,
                    'group_name' => $item->group_name,
                    'transaction_count' => (int) $item->transaction_count,
                    'total_amount' => round((float) $item->total_amount, 2)
                ];
            })
            ->toArray();
    }

    /**
     * Get available payment modes for filter
     */
    public function getPaymentModes()
    {
        try {
            $paymentModes = DB::table('payment_modes')
                ->where('status', 1)
                ->select(['id', 'name'])
                ->orderBy('name')
                ->get();
            
            return response()->json([
                'success' => true,
                'data' => $paymentModes
            ]);
        } catch (\Exception $e) {
            return response()->json([
                'success' => false,
                'message' => 'Failed to fetch payment modes'
            ], 500);
        }
    }

    /**
     * Get available staff/users for filter
     */
    public function getStaffList()
    {
        try {
            $query = DB::table('bookings as b')
                ->join('users as u', 'b.created_by', '=', 'u.id')
                ->where('b.account_migration', 1);
            
            if (!$this->isAdminUser()) {
                $currentUserId = $this->getAuthUserId();
                if ($currentUserId) {
                    $query->where(function($q) use ($currentUserId) {
                        $q->where('b.user_id', $currentUserId)
                          ->orWhere('b.created_by', $currentUserId);
                    });
                }
            }
            
            $staff = $query->select([
                    'u.id',
                    DB::raw("COALESCE(u.name, u.username) as name")
                ])
                ->distinct()
                ->orderBy('name')
                ->get();
            
            return response()->json([
                'success' => true,
                'data' => $staff
            ]);
        } catch (\Exception $e) {
            return response()->json([
                'success' => false,
                'message' => 'Failed to fetch staff list'
            ], 500);
        }
    }

    /**
     * Get temple settings
     */
    private function getTempleSettings()
    {
        $settings = DB::table('settings')
            ->whereIn('key', [
                'temple_name',
                'temple_name_secondary',
                'temple_address',
                'temple_city',
                'temple_state',
                'temple_pincode',
                'temple_country',
                'temple_phone',
                'temple_email'
            ])
            ->pluck('value', 'key');
        
        return [
            'name' => $settings['temple_name'] ?? 'Temple',
            'name_secondary' => $settings['temple_name_secondary'] ?? '',
            'address' => $settings['temple_address'] ?? '',
            'city' => $settings['temple_city'] ?? '',
            'state' => $settings['temple_state'] ?? '',
            'pincode' => $settings['temple_pincode'] ?? '',
            'country' => $settings['temple_country'] ?? '',
            'phone' => $settings['temple_phone'] ?? '',
            'email' => $settings['temple_email'] ?? ''
        ];
    }

    /**
     * Export daily closing to PDF
     */
    public function exportPdf(Request $request)
    {
        try {
            $fromDate = $request->input('from_date', Carbon::today()->format('Y-m-d'));
            $toDate = $request->input('to_date', Carbon::today()->format('Y-m-d'));
            $paymentModeId = $request->input('payment_mode_id');
            $createdBy = $request->input('created_by');
            
            $from = Carbon::parse($fromDate)->startOfDay();
            $to = Carbon::parse($toDate)->endOfDay();
            
            // Fetch all module data
            $salesData = $this->fetchSalesClosingData($from, $to, $paymentModeId, $createdBy);
            $donationData = $this->fetchDonationClosingData($from, $to, $paymentModeId, $createdBy);
            $buddhaLampData = $this->fetchBuddhaLampClosingData($from, $to, $paymentModeId, $createdBy);
            $templeEventsData = $this->fetchTempleEventsClosingData($from, $to, $paymentModeId, $createdBy);
            
            $salesSummary = $this->calculateSalesSummary($salesData);
            $donationSummary = $this->calculateDonationSummary($donationData);
            $buddhaLampSummary = $this->calculateBuddhaLampSummary($buddhaLampData);
            $templeEventsSummary = $this->calculateTempleEventsSummary($templeEventsData);
            
            $templeSettings = $this->getTempleSettings();
            $currentUser = auth()->user();
            
            $data = [
                'title' => 'Daily Closing Report',
                'temple' => $templeSettings,
                'from_date' => $fromDate,
                'to_date' => $toDate,
                'sales' => [
                    'transactions' => $salesData,
                    'summary' => $salesSummary
                ],
                'donation' => [
                    'transactions' => $donationData,
                    'summary' => $donationSummary
                ],
                'buddha_lamp' => [
                    'transactions' => $buddhaLampData,
                    'summary' => $buddhaLampSummary
                ],
                'temple_events' => [
                    'transactions' => $templeEventsData,
                    'summary' => $templeEventsSummary
                ],
                'generated_at' => Carbon::now()->format('Y-m-d H:i:s'),
                'generated_by' => $currentUser->name ?? 'System',
                'is_filtered' => !$this->isAdminUser(),
                'filter_info' => $this->isAdminUser() ? 'All Counters' : 'Counter: ' . ($currentUser->name ?? $currentUser->username)
            ];
            
            $pdf = PDF::loadView('reports.daily-closing-unified', $data);
            $pdf->setPaper('a4', 'landscape');
            
            $filename = 'daily_closing_' . $fromDate . '_to_' . $toDate . '.pdf';
            
            return $pdf->download($filename);
            
        } catch (\Exception $e) {
            Log::error('Daily Closing PDF Export Error', [
                'error' => $e->getMessage()
            ]);
            
            return response()->json([
                'success' => false,
                'message' => 'Failed to generate PDF: ' . $e->getMessage()
            ], 500);
        }
    }

    /**
     * Print daily closing report
     */
    public function printReport(Request $request)
    {
        try {
            $fromDate = $request->input('from_date', Carbon::today()->format('Y-m-d'));
            $toDate = $request->input('to_date', Carbon::today()->format('Y-m-d'));
            $paymentModeId = $request->input('payment_mode_id');
            $createdBy = $request->input('created_by');
            
            $from = Carbon::parse($fromDate)->startOfDay();
            $to = Carbon::parse($toDate)->endOfDay();
            
            // Fetch all module data
            $salesData = $this->fetchSalesClosingData($from, $to, $paymentModeId, $createdBy);
            $donationData = $this->fetchDonationClosingData($from, $to, $paymentModeId, $createdBy);
            $buddhaLampData = $this->fetchBuddhaLampClosingData($from, $to, $paymentModeId, $createdBy);
            $templeEventsData = $this->fetchTempleEventsClosingData($from, $to, $paymentModeId, $createdBy);
            
            $salesSummary = $this->calculateSalesSummary($salesData);
            $donationSummary = $this->calculateDonationSummary($donationData);
            $buddhaLampSummary = $this->calculateBuddhaLampSummary($buddhaLampData);
            $templeEventsSummary = $this->calculateTempleEventsSummary($templeEventsData);
            
            $templeSettings = $this->getTempleSettings();
            $currentUser = auth()->user();
            
            $printData = [
                'temple' => $templeSettings,
                'from_date' => $fromDate,
                'to_date' => $toDate,
                'sales' => [
                    'transactions' => $salesData,
                    'summary' => $salesSummary
                ],
                'donation' => [
                    'transactions' => $donationData,
                    'summary' => $donationSummary
                ],
                'buddha_lamp' => [
                    'transactions' => $buddhaLampData,
                    'summary' => $buddhaLampSummary
                ],
                'temple_events' => [
                    'transactions' => $templeEventsData,
                    'summary' => $templeEventsSummary
                ],
                'generated_at' => Carbon::now()->format('Y-m-d H:i:s'),
                'generated_by' => $currentUser->name ?? 'System',
                'is_filtered' => !$this->isAdminUser(),
                'filter_info' => $this->isAdminUser() ? 'All Counters' : 'Counter: ' . ($currentUser->name ?? $currentUser->username)
            ];
            
            return response()->json([
                'success' => true,
                'data' => $printData
            ]);
            
        } catch (\Exception $e) {
            return response()->json([
                'success' => false,
                'message' => 'Failed to prepare print data: ' . $e->getMessage()
            ], 500);
        }
    }
}