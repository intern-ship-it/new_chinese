<?php

namespace App\Http\Controllers;

use Illuminate\Http\Request;
use Illuminate\Support\Facades\DB;
use App\Models\User;
use App\Models\MemberDetail;
use App\Models\MemberType;
use Carbon\Carbon;
use Illuminate\Support\Facades\Log;
use App\Exports\MemberReportExport;
use Maatwebsite\Excel\Facades\Excel;
use Barryvdh\DomPDF\Facade\Pdf;

class MemberReportController extends Controller
{
    /**
     * Get members list with filters
     */
    public function getMembersReport(Request $request)
    {
        try {
            $query = User::with(['memberDetail.memberType', 'memberDetail.referredBy'])
                ->where('user_type', 'MEMBER');

            // Filter: Member Type
            if ($request->filled('member_type_id')) {
                $query->whereHas('memberDetail', function ($q) use ($request) {
                    $q->where('member_type_id', $request->member_type_id);
                });
            }

            // Filter: Status (Active/Inactive)
            if ($request->filled('status')) {
                if ($request->status === 'active') {
                    $query->where('is_active', true);
                } elseif ($request->status === 'inactive') {
                    $query->where('is_active', false);
                }
            }

            // Filter: Subscription Status
            if ($request->filled('subscription_status')) {
                $query->whereHas('memberDetail', function ($q) use ($request) {
                    $q->where('subscription_status', $request->subscription_status);
                });
            }

            // Filter: Gender
            if ($request->filled('gender')) {
                $query->where('gender', $request->gender);
            }

            // Filter: City
            if ($request->filled('city')) {
                $query->where('city', 'ILIKE', '%' . $request->city . '%');
            }

            // Filter: State
            if ($request->filled('state')) {
                $query->where('state', 'ILIKE', '%' . $request->state . '%');
            }

            // Filter: Membership Date Range
            if ($request->filled('membership_from')) {
                $query->whereHas('memberDetail', function ($q) use ($request) {
                    $q->whereDate('membership_date', '>=', $request->membership_from);
                });
            }

            if ($request->filled('membership_to')) {
                $query->whereHas('memberDetail', function ($q) use ($request) {
                    $q->whereDate('membership_date', '<=', $request->membership_to);
                });
            }

            // Filter: Search (Name, Email, Member Code, Mobile)
            if ($request->filled('search')) {
                $search = $request->search;
                $query->where(function ($q) use ($search) {
                    $q->where('name', 'ILIKE', '%' . $search . '%')
                        ->orWhere('email', 'ILIKE', '%' . $search . '%')
                        ->orWhere('mobile_no', 'LIKE', '%' . $search . '%')
                        ->orWhereHas('memberDetail', function ($q2) use ($search) {
                            $q2->where('member_code', 'ILIKE', '%' . $search . '%');
                        });
                });
            }

            // Sort
            $sortBy = $request->get('sort_by', 'created_at');
            $sortOrder = $request->get('sort_order', 'desc');
            $query->orderBy($sortBy, $sortOrder);

            // Pagination
            $perPage = $request->get('per_page', 20);
            $members = $query->paginate($perPage);

            // Transform data
            $members->getCollection()->transform(function ($member) {
                return $this->transformMember($member);
            });

            return response()->json([
                'success' => true,
                'data' => $members
            ]);

        } catch (\Exception $e) {
            Log::error('Error fetching member report: ' . $e->getMessage());
            return response()->json([
                'success' => false,
                'message' => 'Failed to fetch member report',
                'error' => $e->getMessage()
            ], 500);
        }
    }

    /**
     * Get member statistics for dashboard
     */
    public function getStatistics(Request $request)
    {
        try {
            $stats = [
                'total_members' => User::where('user_type', 'MEMBER')->count(),
                'active_members' => User::where('user_type', 'MEMBER')->where('is_active', true)->count(),
                'inactive_members' => User::where('user_type', 'MEMBER')->where('is_active', false)->count(),
                'paid_members' => MemberDetail::whereHas('memberType', function ($q) {
                    $q->where('is_paid', true);
                })->count(),
                'free_members' => MemberDetail::whereHas('memberType', function ($q) {
                    $q->where('is_paid', false);
                })->count(),
            ];

            // Subscription status breakdown
            $subscriptionStats = MemberDetail::select('subscription_status', DB::raw('count(*) as count'))
                ->groupBy('subscription_status')
                ->get()
                ->pluck('count', 'subscription_status')
                ->toArray();

            $stats['subscription_status'] = $subscriptionStats;

            // Gender breakdown
            $genderStats = User::where('user_type', 'MEMBER')
                ->select('gender', DB::raw('count(*) as count'))
                ->groupBy('gender')
                ->get()
                ->pluck('count', 'gender')
                ->toArray();

            $stats['gender_breakdown'] = $genderStats;

            // Member type breakdown
            $memberTypeStats = MemberDetail::with('memberType')
                ->get()
                ->groupBy('member_type_id')
                ->map(function ($group) {
                    return [
                        'type_name' => $group->first()->memberType->display_name ?? 'Unknown',
                        'count' => $group->count()
                    ];
                })
                ->values();

            $stats['member_type_breakdown'] = $memberTypeStats;

            // New members this month
            $stats['new_this_month'] = User::where('user_type', 'MEMBER')
                ->whereMonth('created_at', Carbon::now()->month)
                ->whereYear('created_at', Carbon::now()->year)
                ->count();

            return response()->json([
                'success' => true,
                'data' => $stats
            ]);

        } catch (\Exception $e) {
            Log::error('Error fetching statistics: ' . $e->getMessage());
            return response()->json([
                'success' => false,
                'message' => 'Failed to fetch statistics'
            ], 500);
        }
    }

    /**
     * Export members report
     */
    public function exportReport(Request $request)
    {
        try {
            $format = $request->get('format', 'excel'); // excel, pdf, csv

            // Get all members with same filters (no pagination)
            $query = User::with(['memberDetail.memberType', 'memberDetail.referredBy'])
                ->where('user_type', 'MEMBER');

            // Apply same filters
            $this->applyFilters($query, $request);

            // Sort
            $sortBy = $request->get('sort_by', 'created_at');
            $sortOrder = $request->get('sort_order', 'desc');
            $query->orderBy($sortBy, $sortOrder);

            $members = $query->get()->map(function ($member) {
                return $this->transformMember($member);
            });

            $filename = 'members_report_' . date('Y-m-d_His');

            if ($format === 'excel') {
                // Excel Export
                return Excel::download(
                    new MemberReportExport($members, $request->all()),
                    $filename . '.xlsx'
                );
            } elseif ($format === 'csv') {
                // CSV Export
                return Excel::download(
                    new MemberReportExport($members, $request->all()),
                    $filename . '.csv',
                    \Maatwebsite\Excel\Excel::CSV
                );
            } elseif ($format === 'pdf') {
                // PDF Export
                $data = [
                    'members' => $members,
                    'generated_at' => Carbon::now()->format('d M Y H:i:s'),
                    'filters' => $request->all(),
                    'total_count' => $members->count()
                ];

                $pdf = Pdf::loadView('exports.members-report', $data);
                $pdf->setPaper('a4', 'landscape');

                return $pdf->download($filename . '.pdf');
            }

        } catch (\Exception $e) {
            Log::error('Error exporting report: ' . $e->getMessage());
            return response()->json([
                'success' => false,
                'message' => 'Failed to export report: ' . $e->getMessage()
            ], 500);
        }
    }

    /**
     * Get filter options (for dropdowns)
     */
    public function getFilterOptions()
    {
        try {
            $options = [
                'member_types' => MemberType::where('is_active', true)
                    ->select('id', 'display_name', 'is_paid')
                    ->get(),
                'cities' => User::where('user_type', 'MEMBER')
                    ->whereNotNull('city')
                    ->distinct()
                    ->pluck('city'),
                'states' => User::where('user_type', 'MEMBER')
                    ->whereNotNull('state')
                    ->distinct()
                    ->pluck('state'),
                'subscription_statuses' => ['ACTIVE', 'EXPIRED', 'INACTIVE', 'PENDING'],
                'genders' => ['MALE', 'FEMALE', 'OTHER']
            ];

            return response()->json([
                'success' => true,
                'data' => $options
            ]);

        } catch (\Exception $e) {
            Log::error('Error fetching filter options: ' . $e->getMessage());
            return response()->json([
                'success' => false,
                'message' => 'Failed to fetch filter options'
            ], 500);
        }
    }

    /**
     * Apply filters to query
     */
    private function applyFilters($query, $request)
    {
        if ($request->filled('member_type_id')) {
            $query->whereHas('memberDetail', function ($q) use ($request) {
                $q->where('member_type_id', $request->member_type_id);
            });
        }

        if ($request->filled('status')) {
            if ($request->status === 'active') {
                $query->where('is_active', true);
            } elseif ($request->status === 'inactive') {
                $query->where('is_active', false);
            }
        }

        if ($request->filled('subscription_status')) {
            $query->whereHas('memberDetail', function ($q) use ($request) {
                $q->where('subscription_status', $request->subscription_status);
            });
        }

        if ($request->filled('gender')) {
            $query->where('gender', $request->gender);
        }

        if ($request->filled('city')) {
            $query->where('city', 'ILIKE', '%' . $request->city . '%');
        }

        if ($request->filled('state')) {
            $query->where('state', 'ILIKE', '%' . $request->state . '%');
        }

        if ($request->filled('membership_from')) {
            $query->whereHas('memberDetail', function ($q) use ($request) {
                $q->whereDate('membership_date', '>=', $request->membership_from);
            });
        }

        if ($request->filled('membership_to')) {
            $query->whereHas('memberDetail', function ($q) use ($request) {
                $q->whereDate('membership_date', '<=', $request->membership_to);
            });
        }

        if ($request->filled('search')) {
            $search = $request->search;
            $query->where(function ($q) use ($search) {
                $q->where('name', 'ILIKE', '%' . $search . '%')
                    ->orWhere('email', 'ILIKE', '%' . $search . '%')
                    ->orWhere('mobile_no', 'LIKE', '%' . $search . '%');
            });
        }
    }

    /**
     * Transform member data
     */
    private function transformMember($member)
    {
        $data = [
            'id' => $member->id,
            'name' => $member->name,
            'email' => $member->email,
            'mobile_no' => $member->mobile_no,
            'mobile_code' => $member->mobile_code,
            'gender' => $member->gender,
            'date_of_birth' => $member->date_of_birth,
            'city' => $member->city,
            'state' => $member->state,
            'country' => $member->country,
            'is_active' => $member->is_active,
            'created_at' => $member->created_at,
        ];

        if ($member->memberDetail) {
            $data['member_details'] = [
                'member_code' => $member->memberDetail->member_code,
                'membership_date' => $member->memberDetail->membership_date,
                'subscription_status' => $member->memberDetail->subscription_status,
                'subscription_start_date' => $member->memberDetail->subscription_start_date,
                'subscription_end_date' => $member->memberDetail->subscription_end_date,
                'occupation' => $member->memberDetail->occupation,
                'qualification' => $member->memberDetail->qualification,
                'annual_income' => $member->memberDetail->annual_income,
                'member_type' => $member->memberDetail->memberType ? [
                    'id' => $member->memberDetail->memberType->id,
                    'name' => $member->memberDetail->memberType->display_name,
                    'is_paid' => $member->memberDetail->memberType->is_paid
                ] : null,
                'referred_by' => $member->memberDetail->referredBy ? [
                    'id' => $member->memberDetail->referredBy->id,
                    'name' => $member->memberDetail->referredBy->name
                ] : null
            ];
        }

        return $data;
    }
}