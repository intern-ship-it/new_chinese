<?php

namespace App\Http\Controllers;

use App\Models\VenueMaster;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Auth;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Validator;

class VenueMasterController extends Controller
{
    /**
     * Get all venues with pagination and filters
     */
    public function index(Request $request)
    {
        try {
            $query = VenueMaster::with(['createdBy:id,name', 'updatedBy:id,name']);

            // Filter by status
            if ($request->filled('status')) {
                $query->where('status', $request->status);
            }

            // Search
            if ($request->filled('search')) {
                $search = $request->search;
                $query->where(function ($q) use ($search) {
                    $q->where('venue_name', 'ILIKE', "%{$search}%")
                        ->orWhere('venue_name_chinese', 'ILIKE', "%{$search}%")
                        ->orWhere('location', 'ILIKE', "%{$search}%");
                });
            }

            // Sorting
            $sortBy = $request->input('sort_by', 'venue_name');
            $sortOrder = $request->input('sort_order', 'asc');
            $query->orderBy($sortBy, $sortOrder);

            // Pagination
            $perPage = $request->input('per_page', 10);
            $venues = $query->paginate($perPage);

            return response()->json([
                'success' => true,
                'data' => $venues->items(),
                'pagination' => [
                    'current_page' => $venues->currentPage(),
                    'total_pages' => $venues->lastPage(),
                    'per_page' => $venues->perPage(),
                    'total' => $venues->total(),
                    'from' => $venues->firstItem(),
                    'to' => $venues->lastItem()
                ]
            ]);
        } catch (\Exception $e) {
            return response()->json([
                'success' => false,
                'message' => 'Failed to fetch venues',
                'error' => $e->getMessage()
            ], 500);
        }
    }

    /**
     * Get single venue
     */
    public function show($id)
    {
        try {
            $venue = VenueMaster::with(['createdBy:id,name', 'updatedBy:id,name'])->find($id);

            if (!$venue) {
                return response()->json([
                    'success' => false,
                    'message' => 'Venue not found'
                ], 404);
            }

            return response()->json([
                'success' => true,
                'data' => $venue
            ]);
        } catch (\Exception $e) {
            return response()->json([
                'success' => false,
                'message' => 'Failed to fetch venue',
                'error' => $e->getMessage()
            ], 500);
        }
    }

    /**
     * Create new venue
     */
    public function store(Request $request)
    {
        $validator = Validator::make($request->all(), [
            'venue_name' => 'required|string|max:255',
            'venue_name_chinese' => 'nullable|string|max:255',
            'description' => 'nullable|string',
            'description_chinese' => 'nullable|string',
            'location' => 'nullable|string|max:500',
            'capacity' => 'nullable|integer|min:0',
            'area_sqft' => 'nullable|numeric|min:0',
            'facilities' => 'nullable|string',
            'facilities_chinese' => 'nullable|string',
            'status' => 'required|integer|in:0,1'
        ]);

        if ($validator->fails()) {
            return response()->json([
                'success' => false,
                'message' => 'Validation failed',
                'errors' => $validator->errors()
            ], 422);
        }

        try {
            $venue = VenueMaster::create([
                'venue_name' => $request->venue_name,
                'venue_name_chinese' => $request->venue_name_chinese,
                'description' => $request->description,
                'description_chinese' => $request->description_chinese,
                'location' => $request->location,
                'capacity' => $request->capacity,
                'area_sqft' => $request->area_sqft,
                'facilities' => $request->facilities,
                'facilities_chinese' => $request->facilities_chinese,
                'status' => $request->status,
                'created_by' => Auth::id()
            ]);

            return response()->json([
                'success' => true,
                'message' => 'Venue created successfully',
                'data' => $venue
            ], 201);
        } catch (\Exception $e) {
            return response()->json([
                'success' => false,
                'message' => 'Failed to create venue',
                'error' => $e->getMessage()
            ], 500);
        }
    }

    /**
     * Update venue
     */
    public function update(Request $request, $id)
    {
        $validator = Validator::make($request->all(), [
            'venue_name' => 'required|string|max:255',
            'venue_name_chinese' => 'nullable|string|max:255',
            'description' => 'nullable|string',
            'description_chinese' => 'nullable|string',
            'location' => 'nullable|string|max:500',
            'capacity' => 'nullable|integer|min:0',
            'area_sqft' => 'nullable|numeric|min:0',
            'facilities' => 'nullable|string',
            'facilities_chinese' => 'nullable|string',
            'status' => 'required|integer|in:0,1'
        ]);

        if ($validator->fails()) {
            return response()->json([
                'success' => false,
                'message' => 'Validation failed',
                'errors' => $validator->errors()
            ], 422);
        }

        try {
            $venue = VenueMaster::find($id);

            if (!$venue) {
                return response()->json([
                    'success' => false,
                    'message' => 'Venue not found'
                ], 404);
            }

            $venue->update([
                'venue_name' => $request->venue_name,
                'venue_name_chinese' => $request->venue_name_chinese,
                'description' => $request->description,
                'description_chinese' => $request->description_chinese,
                'location' => $request->location,
                'capacity' => $request->capacity,
                'area_sqft' => $request->area_sqft,
                'facilities' => $request->facilities,
                'facilities_chinese' => $request->facilities_chinese,
                'status' => $request->status,
                'updated_by' => Auth::id()
            ]);

            return response()->json([
                'success' => true,
                'message' => 'Venue updated successfully',
                'data' => $venue
            ]);
        } catch (\Exception $e) {
            return response()->json([
                'success' => false,
                'message' => 'Failed to update venue',
                'error' => $e->getMessage()
            ], 500);
        }
    }

    /**
     * Delete venue (soft delete)
     */
    public function destroy($id)
    {
        try {
            $venue = VenueMaster::find($id);

            if (!$venue) {
                return response()->json([
                    'success' => false,
                    'message' => 'Venue not found'
                ], 404);
            }

            $venue->delete();

            return response()->json([
                'success' => true,
                'message' => 'Venue deleted successfully'
            ]);
        } catch (\Exception $e) {
            return response()->json([
                'success' => false,
                'message' => 'Failed to delete venue',
                'error' => $e->getMessage()
            ], 500);
        }
    }

    /**
     * Get active venues (for dropdowns)
     */
    public function getActiveVenues()
    {
        try {
            $venues = VenueMaster::active()
                ->select('id', 'venue_name', 'venue_name_chinese', 'capacity', 'location')
                ->orderBy('venue_name')
                ->get();

            return response()->json([
                'success' => true,
                'data' => $venues
            ]);
        } catch (\Exception $e) {
            return response()->json([
                'success' => false,
                'message' => 'Failed to fetch active venues',
                'error' => $e->getMessage()
            ], 500);
        }
    }
}