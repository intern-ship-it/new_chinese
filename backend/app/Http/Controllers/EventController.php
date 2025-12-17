<?php

namespace App\Http\Controllers;

use App\Http\Controllers\Controller;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Validator;
use Illuminate\Support\Facades\DB;

class EventController extends Controller
{
    /**
     * Get all events with pagination and filtering
     * GET /api/v1/events
     */
    public function index(Request $request)
    {
        try {
            
            $query = DB::table('events')
                ->where('deleted_at', null);

            // Apply filters
            if ($request->has('status') && $request->status != '') {
                $query->where('status', $request->status);
            }

            if ($request->has('search') && $request->search != '') {
                $search = $request->search;
                $query->where(function($q) use ($search) {
                    $q->where('event_name_primary', 'like', "%{$search}%")
                      ->orWhere('event_name_secondary', 'like', "%{$search}%");
                });
            }

            if ($request->has('from_date') && $request->from_date != '') {
                $query->where('from_date', '>=', $request->from_date);
            }

            if ($request->has('to_date') && $request->to_date != '') {
                $query->where('to_date', '<=', $request->to_date);
            }

            // Get total count before pagination
            $total = $query->count();

            // Pagination
            $perPage = $request->get('per_page', 25);
            $page = $request->get('page', 1);
            $offset = ($page - 1) * $perPage;

            $events = $query->orderBy('created_at', 'desc')
                ->offset($offset)
                ->limit($perPage)
                ->get();

            return response()->json([
                'success' => true,
                'data' => $events,
                'pagination' => [
                    'total' => $total,
                    'per_page' => $perPage,
                    'current_page' => $page,
                    'last_page' => ceil($total / $perPage),
                ]
            ]);
        } catch (\Exception $e) {
            return response()->json([
                'success' => false,
                'message' => 'Failed to fetch events',
                'error' => $e->getMessage()
            ], 500);
        }
    }

    /**
     * Get single event by ID
     * GET /api/v1/events/{id}
     */
    public function show($id, Request $request)
    {
        try {
            
            $event = DB::table('events')
                ->where('id', $id)
                ->where('deleted_at', null)
                ->first();

            if (!$event) {
                return response()->json([
                    'success' => false,
                    'message' => 'Event not found'
                ], 404);
            }

            return response()->json([
                'success' => true,
                'data' => $event
            ]);
        } catch (\Exception $e) {
            return response()->json([
                'success' => false,
                'message' => 'Failed to fetch event',
                'error' => $e->getMessage()
            ], 500);
        }
    }

    /**
     * Create new event
     * POST /api/v1/events
     */
    public function store(Request $request)
    {
        try {

            // Validation
            $validator = Validator::make($request->all(), [
                'event_name_primary' => 'required|string|max:255',
                'event_name_secondary' => 'nullable|string|max:255',
                'from_date' => 'required|date',
                'to_date' => 'required|date|after_or_equal:from_date',
                'description_primary' => 'nullable|string',
                'description_secondary' => 'nullable|string',
                'price' => 'required|numeric|min:0',
                'special_price' => 'nullable|numeric|min:0',
                'max_booking_count' => 'nullable|integer|min:0',
                'max_booking_per_day' => 'nullable|integer|min:0',
                'status' => 'required|in:active,inactive,draft'
            ]);

            if ($validator->fails()) {
                return response()->json([
                    'success' => false,
                    'message' => 'Validation failed',
                    'errors' => $validator->errors()
                ], 422);
            }

            // Insert event
            $eventId = DB::table('events')->insertGetId([
                'event_name_primary' => $request->event_name_primary,
                'event_name_secondary' => $request->event_name_secondary,
                'from_date' => $request->from_date,
                'to_date' => $request->to_date,
                'description_primary' => $request->description_primary,
                'description_secondary' => $request->description_secondary,
                'price' => $request->price,
                'special_price' => $request->special_price,
                'max_booking_count' => $request->max_booking_count,
                'max_booking_per_day' => $request->max_booking_per_day,
                'status' => $request->status,
                'created_at' => now(),
                'updated_at' => now()
            ]);

            // Fetch created event
            $event = DB::table('events')->where('id', $eventId)->first();

            return response()->json([
                'success' => true,
                'message' => 'Event created successfully',
                'data' => $event
            ], 201);
        } catch (\Exception $e) {
            return response()->json([
                'success' => false,
                'message' => 'Failed to create event',
                'error' => $e->getMessage()
            ], 500);
        }
    }

    /**
     * Update event
     * PUT /api/v1/events/{id}
     */
    public function update($id, Request $request)
    {
        try {

            // Check if event exists
            $event = DB::table('events')
                ->where('id', $id)
                ->where('deleted_at', null)
                ->first();

            if (!$event) {
                return response()->json([
                    'success' => false,
                    'message' => 'Event not found'
                ], 404);
            }

            // Validation
            $validator = Validator::make($request->all(), [
                'event_name_primary' => 'required|string|max:255',
                'event_name_secondary' => 'nullable|string|max:255',
                'from_date' => 'required|date',
                'to_date' => 'required|date|after_or_equal:from_date',
                'description_primary' => 'nullable|string',
                'description_secondary' => 'nullable|string',
                'price' => 'required|numeric|min:0',
                'special_price' => 'nullable|numeric|min:0',
                'max_booking_count' => 'nullable|integer|min:0',
                'max_booking_per_day' => 'nullable|integer|min:0',
                'status' => 'required|in:active,inactive,draft'
            ]);

            if ($validator->fails()) {
                return response()->json([
                    'success' => false,
                    'message' => 'Validation failed',
                    'errors' => $validator->errors()
                ], 422);
            }

            // Update event
            DB::table('events')
                ->where('id', $id)
                ->update([
                    'event_name_primary' => $request->event_name_primary,
                    'event_name_secondary' => $request->event_name_secondary,
                    'from_date' => $request->from_date,
                    'to_date' => $request->to_date,
                    'description_primary' => $request->description_primary,
                    'description_secondary' => $request->description_secondary,
                    'price' => $request->price,
                    'special_price' => $request->special_price,
                    'max_booking_count' => $request->max_booking_count,
                    'max_booking_per_day' => $request->max_booking_per_day,
                    'status' => $request->status,
                    'updated_at' => now()
                ]);

            // Fetch updated event
            $updatedEvent = DB::table('events')->where('id', $id)->first();

            return response()->json([
                'success' => true,
                'message' => 'Event updated successfully',
                'data' => $updatedEvent
            ]);
        } catch (\Exception $e) {
            return response()->json([
                'success' => false,
                'message' => 'Failed to update event',
                'error' => $e->getMessage()
            ], 500);
        }
    }

    /**
     * Delete event (soft delete)
     * DELETE /api/v1/events/{id}
     */
    public function destroy($id, Request $request)
    {
        try {

            // Check if event exists
            $event = DB::table('events')
                ->where('id', $id)
                ->where('deleted_at', null)
                ->first();

            if (!$event) {
                return response()->json([
                    'success' => false,
                    'message' => 'Event not found'
                ], 404);
            }

            // Soft delete
            DB::table('events')
                ->where('id', $id)
                ->update([
                    'deleted_at' => now(),
                    'updated_at' => now()
                ]);

            return response()->json([
                'success' => true,
                'message' => 'Event deleted successfully'
            ]);
        } catch (\Exception $e) {
            return response()->json([
                'success' => false,
                'message' => 'Failed to delete event',
                'error' => $e->getMessage()
            ], 500);
        }
    }
}