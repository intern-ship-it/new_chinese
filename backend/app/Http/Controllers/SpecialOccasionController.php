<?php

namespace App\Http\Controllers;

use App\Models\SpecialOccasion;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Validator;
use Illuminate\Support\Facades\Log;
use Illuminate\Support\Facades\DB;
use Exception;

class SpecialOccasionController extends Controller
{
  /**
   * Display a listing of special occasions
   */
  public function index(Request $request)
  {
    try {
      // FIXED: Create instance instead of calling statically
      $model = new SpecialOccasion();
      $connection = $model->getConnectionName();
      $database = $model->getConnection()->getDatabaseName();

      Log::info('=== Special Occasion Index Debug ===');
      Log::info('Connection Name: ' . $connection);
      Log::info('Database Name: ' . $database);

      $query = SpecialOccasion::query();

      // Count total records
      $totalRecords = $query->count();
      Log::info('Total records in table: ' . $totalRecords);

      // Filter by status (only if not empty)
      if ($request->has('status') && $request->status != '') {
        $query->where('status', $request->status);
      }

      // Filter by secondary language (only if not empty)
      if ($request->has('secondary_lang') && $request->secondary_lang != '') {
        $query->bySecondaryLang($request->secondary_lang);
      }

      // Search (only if not empty)
      if ($request->has('search') && $request->search != '') {
        $query->search($request->search);
      }

      $occasions = $query->orderBy('created_at', 'desc')->get();

      return response()->json([
        'success' => true,
        'count' => $occasions->count(),
        'data' => $occasions
      ], 200);
    } catch (Exception $e) {
      Log::error('Error fetching special occasions: ' . $e->getMessage());
      Log::error('Stack trace: ' . $e->getTraceAsString());
      return response()->json([
        'success' => false,
        'message' => 'Internal server error',
        'error' => $e->getMessage()
      ], 500);
    }
  }


  /**
   * Store a special occasion booking
   */
  public function storeBooking(Request $request)
  {
    try {
      $validator = Validator::make($request->all(), [
        'special_occasion_id' => 'required|exists:special_occ_master,id',
        'occasion_name' => 'required|string',
        'occasion_option' => 'required|string',
        'occasion_amount' => 'required|numeric|min:0',
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

      // Create booking record (you'll need to create this table/model)
      $booking = DB::table('special_occasion_bookings')->insertGetId([
        'special_occasion_id' => $request->special_occasion_id,
        'occasion_name' => $request->occasion_name,
        'occasion_option' => $request->occasion_option,
        'occasion_amount' => $request->occasion_amount,
        'name_chinese' => $request->name_chinese,
        'name_english' => $request->name_english,
        'nric' => $request->nric,
        'email' => $request->email,
        'contact_no' => $request->contact_no,
        'payment_methods' => $request->payment_methods,
        'remark' => $request->remark,
        'booking_date' => now(),
        'status' => 'pending',
        'created_at' => now(),
        'updated_at' => now()
      ]);

      return response()->json([
        'success' => true,
        'message' => 'Booking submitted successfully',
        'data' => ['id' => $booking]
      ], 201);
    } catch (Exception $e) {
      Log::error('Error creating booking: ' . $e->getMessage());
      return response()->json([
        'success' => false,
        'message' => 'Internal server error',
        'error' => $e->getMessage()
      ], 500);
    }
  }


  /**
   * Get booking history (all bookings or filtered by email)
   */
  public function getBookingHistory(Request $request)
  {
    try {
      $query = DB::table('special_occasion_bookings')
        ->select('special_occasion_bookings.*')
        ->orderBy('booking_date', 'desc');

      // Optional: Filter by email if provided
      if ($request->has('email') && $request->email != '') {
        $query->where('email', $request->email);
      }

      // Optional: Filter by status
      if ($request->has('status') && $request->status != '') {
        $query->where('status', $request->status);
      }

      // Pagination
      $perPage = $request->get('per_page', 10);
      $page = $request->get('page', 1);

      $total = $query->count();
      $bookings = $query->skip(($page - 1) * $perPage)
        ->take($perPage)
        ->get();

      return response()->json([
        'success' => true,
        'data' => $bookings,
        'pagination' => [
          'total' => $total,
          'per_page' => $perPage,
          'current_page' => $page,
          'last_page' => ceil($total / $perPage)
        ]
      ], 200);
    } catch (Exception $e) {
      Log::error('Error fetching booking history: ' . $e->getMessage());
      return response()->json([
        'success' => false,
        'message' => 'Internal server error',
        'error' => $e->getMessage()
      ], 500);
    }
  }

  /**
   * Store a newly created special occasion
   */
  public function store(Request $request)
  {
    try {
      // Validation
      $validator = Validator::make($request->all(), [
        'occasion_name_primary' => 'required|string|max:255',
        'primary_lang' => 'nullable|string|max:50',
        'secondary_lang' => 'nullable|string|max:50',
        'occasion_name_secondary' => 'nullable|string|max:255',
        'occasion_options' => 'nullable|array',
        'occasion_options.*.option_name' => 'required_with:occasion_options|string',
        'occasion_options.*.amount' => 'required_with:occasion_options|numeric|min:0',
        'status' => 'nullable|in:active,inactive'
      ]);

      if ($validator->fails()) {
        return response()->json([
          'success' => false,
          'message' => 'Validation error',
          'errors' => $validator->errors()
        ], 422);
      }

      $occasion = SpecialOccasion::create($request->all());

      return response()->json([
        'success' => true,
        'message' => 'Special occasion created successfully',
        'data' => $occasion
      ], 201);
    } catch (Exception $e) {
      Log::error('Error creating special occasion: ' . $e->getMessage());
      return response()->json([
        'success' => false,
        'message' => 'Internal server error',
        'error' => $e->getMessage()
      ], 500);
    }
  }

  /**
   * Display the specified special occasion
   */
  public function show($id)
  {
    try {
      $occasion = SpecialOccasion::find($id);

      if (!$occasion) {
        return response()->json([
          'success' => false,
          'message' => 'Special occasion not found'
        ], 404);
      }

      return response()->json([
        'success' => true,
        'data' => $occasion
      ], 200);
    } catch (Exception $e) {
      Log::error('Error fetching special occasion: ' . $e->getMessage());
      return response()->json([
        'success' => false,
        'message' => 'Internal server error',
        'error' => $e->getMessage()
      ], 500);
    }
  }

  /**
   * Update the specified special occasion
   */
  public function update(Request $request, $id)
  {
    try {
      $occasion = SpecialOccasion::find($id);

      if (!$occasion) {
        return response()->json([
          'success' => false,
          'message' => 'Special occasion not found'
        ], 404);
      }

      // Validation
      $validator = Validator::make($request->all(), [
        'occasion_name_primary' => 'sometimes|required|string|max:255',
        'primary_lang' => 'nullable|string|max:50',
        'secondary_lang' => 'nullable|string|max:50',
        'occasion_name_secondary' => 'nullable|string|max:255',
        'occasion_options' => 'nullable|array',
        'occasion_options.*.option_name' => 'required_with:occasion_options|string',
        'occasion_options.*.amount' => 'required_with:occasion_options|numeric|min:0',
        'status' => 'nullable|in:active,inactive'
      ]);

      if ($validator->fails()) {
        return response()->json([
          'success' => false,
          'message' => 'Validation error',
          'errors' => $validator->errors()
        ], 422);
      }

      $occasion->update($request->all());

      return response()->json([
        'success' => true,
        'message' => 'Special occasion updated successfully',
        'data' => $occasion
      ], 200);
    } catch (Exception $e) {
      Log::error('Error updating special occasion: ' . $e->getMessage());
      return response()->json([
        'success' => false,
        'message' => 'Internal server error',
        'error' => $e->getMessage()
      ], 500);
    }
  }

  /**
   * Remove the specified special occasion
   */
  public function destroy($id)
  {
    try {
      $occasion = SpecialOccasion::find($id);

      if (!$occasion) {
        return response()->json([
          'success' => false,
          'message' => 'Special occasion not found'
        ], 404);
      }

      $occasion->delete();

      return response()->json([
        'success' => true,
        'message' => 'Special occasion deleted successfully'
      ], 200);
    } catch (Exception $e) {
      Log::error('Error deleting special occasion: ' . $e->getMessage());
      return response()->json([
        'success' => false,
        'message' => 'Internal server error',
        'error' => $e->getMessage()
      ], 500);
    }
  }

  /**
   * Update special occasion status
   */
  public function updateStatus(Request $request, $id)
  {
    try {
      $occasion = SpecialOccasion::find($id);

      if (!$occasion) {
        return response()->json([
          'success' => false,
          'message' => 'Special occasion not found'
        ], 404);
      }

      $validator = Validator::make($request->all(), [
        'status' => 'required|in:active,inactive'
      ]);

      if ($validator->fails()) {
        return response()->json([
          'success' => false,
          'message' => 'Validation error',
          'errors' => $validator->errors()
        ], 422);
      }

      $occasion->update(['status' => $request->status]);

      return response()->json([
        'success' => true,
        'message' => "Special occasion status updated to {$request->status}",
        'data' => $occasion
      ], 200);
    } catch (Exception $e) {
      Log::error('Error updating status: ' . $e->getMessage());
      return response()->json([
        'success' => false,
        'message' => 'Internal server error',
        'error' => $e->getMessage()
      ], 500);
    }
  }
}
