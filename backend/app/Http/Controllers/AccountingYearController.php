<?php

namespace App\Http\Controllers;

use App\Http\Controllers\Controller;
use Illuminate\Http\Request;
use App\Models\AcYear;
use App\Models\Entry;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Auth;
use Illuminate\Support\Facades\Validator;
use Carbon\Carbon;

class AccountingYearController extends Controller
{
    /**
     * Get all accounting years
     * Sorted by most recent first (from_year_month DESC)
     */
    public function index(Request $request)
    {
        try {
            $user = Auth::user();

            $years = AcYear::orderBy('from_year_month', 'desc')
                ->get();

            // Add computed fields
            $years->each(function ($year) {
                $year->financial_year = $year->getFinancialYearString();
                $year->period_string = $year->getPeriodStringAttribute();
                $year->formatted_period = $year->getFormattedPeriod();
            });

            return response()->json([
                'success' => true,
                'data' => $years
            ]);
        } catch (\Exception $e) {
            \Log::error('Error fetching accounting years: ' . $e->getMessage());
            return response()->json([
                'success' => false,
                'message' => 'Error fetching accounting years: ' . $e->getMessage()
            ], 500);
        }
    }


    /**
     * Update an existing accounting year
     */
    public function update(Request $request, $id)
    {
        try {
            $user = Auth::user();

            // Fetch the accounting year to update
            $year = AcYear::find($id);

            // Check if the year exists
            if (!$year) {
                return response()->json([
                    'success' => false,
                    'message' => 'Accounting year not found'
                ], 404);  // Return 404 if not found
            }

            // Update accounting year
            $year->update([
                'status' => $request->status,
            ]);

            // Fetch the updated accounting year data
            $updatedYear = AcYear::find($id);

            return response()->json([
                'success' => true,
                'message' => 'Accounting year updated successfully',
                'data' => $updatedYear
            ]);
        } catch (\Exception $e) {
            \Log::error('Error updating accounting year: ' . $e->getMessage());
            return response()->json([
                'success' => false,
                'message' => 'Error updating accounting year: ' . $e->getMessage()
            ], 500);
        }
    }



    /**
     * Bulk update status
     * Set selected years to status=1 (active)
     * Set unselected years to status=0 (inactive)
     * Allows empty selected_ids array to set all years to inactive
     */
    public function bulkUpdateStatus(Request $request)
    {
        try {
            $user = Auth::user();

            // Validation - selected_ids can be empty array
            $validator = Validator::make($request->all(), [
                'selected_ids' => 'required|array',
                'selected_ids.*' => 'integer|exists:ac_year,id',
                'all_ids' => 'required|array|min:1',
                'all_ids.*' => 'integer|exists:ac_year,id'
            ]);

            if ($validator->fails()) {
                return response()->json([
                    'success' => false,
                    'message' => 'Validation failed',
                    'errors' => $validator->errors()
                ], 422);
            }

            $selectedIds = $request->selected_ids ?? [];
            $allIds = $request->all_ids;

            DB::beginTransaction();

            try {
                // Set unselected years to inactive (status=0)
                $unselectedIds = array_diff($allIds, $selectedIds);

                // If selected IDs are provided, set their status to active (1)
                if (!empty($selectedIds)) {
                    AcYear::whereIn('id', $selectedIds)
                        ->update(['status' => 1]);
                }

                // If unselected IDs are provided, set their status to inactive (0)
                if (!empty($unselectedIds)) {
                    AcYear::whereIn('id', $unselectedIds)
                        ->update(['status' => 0]);
                }

                DB::commit();

                // Determine the message based on whether selected IDs are provided or not
                $message = empty($selectedIds)
                    ? 'All accounting years set to inactive successfully'
                    : 'Accounting year status updated successfully';

                return response()->json([
                    'success' => true,
                    'message' => $message
                ]);
            } catch (\Exception $e) {
                DB::rollBack();
                throw $e; // Rethrow the exception to be handled in the outer catch
            }
        } catch (\Exception $e) {
            \Log::error('Error bulk updating status: ' . $e->getMessage());
            return response()->json([
                'success' => false,
                'message' => 'Error updating status: ' . $e->getMessage()
            ], 500);
        }
    }

    /**
     * Set a single accounting year as active
     * Sets the selected year status to 1 and all others to 0
     */
    public function setActiveYear(Request $request)
    {
        try {
            $user = Auth::user();

            // Validation
            $validator = Validator::make($request->all(), [
                'year_id' => 'required|integer|exists:ac_year,id'
            ]);

            if ($validator->fails()) {
                return response()->json([
                    'success' => false,
                    'message' => 'Validation failed',
                    'errors' => $validator->errors()
                ], 422);
            }

            $yearId = $request->year_id;

            DB::beginTransaction();

            try {
                // First set all years to inactive (status = 0)
                AcYear::query()->update(['status' => 0]);

                // Then set the selected year to active (status = 1)
                AcYear::where('id', $yearId)->update(['status' => 1]);

                DB::commit();

                // Get the updated active year
                $updatedYear = AcYear::find($yearId);

                return response()->json([
                    'success' => true,
                    'message' => 'Active accounting year updated successfully',
                    'data' => $updatedYear
                ]);
            } catch (\Exception $e) {
                DB::rollBack();
                throw $e;
            }
        } catch (\Exception $e) {
            \Log::error('Error setting active year: ' . $e->getMessage());
            return response()->json([
                'success' => false,
                'message' => 'Error setting active year: ' . $e->getMessage()
            ], 500);
        }
    }
}
