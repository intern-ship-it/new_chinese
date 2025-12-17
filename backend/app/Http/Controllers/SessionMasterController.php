<?php

namespace App\Http\Controllers;

use App\Models\SessionMaster;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Auth;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Validator;

class SessionMasterController extends Controller
{
    /**
     * Get all sessions with pagination and filters
     */
    public function index(Request $request)
    {
        try {
            $query = SessionMaster::with(['createdBy:id,name', 'updatedBy:id,name']);

            // Filter by status
            if ($request->filled('status')) {
                $query->where('status', $request->status);
            }

            // Filter by duration
            if ($request->filled('duration')) {
                $query->where('duration_hours', $request->duration);
            }

            // Search
            if ($request->filled('search')) {
                $search = $request->search;
                $query->where(function ($q) use ($search) {
                    $q->where('session_name', 'ILIKE', "%{$search}%")
                        ->orWhere('session_name_chinese', 'ILIKE', "%{$search}%")
                        ->orWhere('description', 'ILIKE', "%{$search}%");
                });
            }

            // Sorting
            $sortBy = $request->input('sort_by', 'session_name');
            $sortOrder = $request->input('sort_order', 'asc');
            $query->orderBy($sortBy, $sortOrder);

            // Pagination
            $perPage = $request->input('per_page', 10);
            $sessions = $query->paginate($perPage);

            // Add formatted attributes
            $sessions->getCollection()->transform(function ($session) {
                $session->duration_formatted = $session->duration_formatted;
                $session->amount_formatted = $session->amount_formatted;
                return $session;
            });

            return response()->json([
                'success' => true,
                'data' => $sessions->items(),
                'pagination' => [
                    'current_page' => $sessions->currentPage(),
                    'total_pages' => $sessions->lastPage(),
                    'per_page' => $sessions->perPage(),
                    'total' => $sessions->total(),
                    'from' => $sessions->firstItem(),
                    'to' => $sessions->lastItem()
                ]
            ]);
        } catch (\Exception $e) {
            return response()->json([
                'success' => false,
                'message' => 'Failed to fetch sessions',
                'error' => $e->getMessage()
            ], 500);
        }
    }

    /**
     * Get single session
     */
    public function show($id)
    {
        try {
            $session = SessionMaster::with(['createdBy:id,name', 'updatedBy:id,name'])->find($id);

            if (!$session) {
                return response()->json([
                    'success' => false,
                    'message' => 'Session not found'
                ], 404);
            }

            return response()->json([
                'success' => true,
                'data' => $session
            ]);
        } catch (\Exception $e) {
            return response()->json([
                'success' => false,
                'message' => 'Failed to fetch session',
                'error' => $e->getMessage()
            ], 500);
        }
    }

    /**
     * Create new session
     */
    public function store(Request $request)
    {
        $validator = Validator::make($request->all(), [
            'session_name' => 'required|string|max:255',
            'session_name_chinese' => 'nullable|string|max:255',
            'duration_hours' => 'required|numeric|min:0.5|max:24',
            'amount' => 'required|numeric|min:0',
            'description' => 'nullable|string',
            'description_chinese' => 'nullable|string',
            'start_time' => 'nullable|date_format:H:i',
            'end_time' => 'nullable|date_format:H:i|after:start_time',
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
            $session = SessionMaster::create([
                'session_name' => $request->session_name,
                'session_name_chinese' => $request->session_name_chinese,
                'duration_hours' => $request->duration_hours,
                'amount' => $request->amount,
                'description' => $request->description,
                'description_chinese' => $request->description_chinese,
                'start_time' => $request->start_time,
                'end_time' => $request->end_time,
                'status' => $request->status,
                'created_by' => Auth::id()
            ]);

            return response()->json([
                'success' => true,
                'message' => 'Session created successfully',
                'data' => $session
            ], 201);
        } catch (\Exception $e) {
            return response()->json([
                'success' => false,
                'message' => 'Failed to create session',
                'error' => $e->getMessage()
            ], 500);
        }
    }

    /**
     * Update session
     */
    public function update(Request $request, $id)
    {
        $validator = Validator::make($request->all(), [
            'session_name' => 'required|string|max:255',
            'session_name_chinese' => 'nullable|string|max:255',
            'duration_hours' => 'required|numeric|min:0.5|max:24',
            'amount' => 'required|numeric|min:0',
            'description' => 'nullable|string',
            'description_chinese' => 'nullable|string',
            'start_time' => 'nullable|date_format:H:i',
            'end_time' => 'nullable|date_format:H:i|after:start_time',
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
            $session = SessionMaster::find($id);

            if (!$session) {
                return response()->json([
                    'success' => false,
                    'message' => 'Session not found'
                ], 404);
            }

            $session->update([
                'session_name' => $request->session_name,
                'session_name_chinese' => $request->session_name_chinese,
                'duration_hours' => $request->duration_hours,
                'amount' => $request->amount,
                'description' => $request->description,
                'description_chinese' => $request->description_chinese,
                'start_time' => $request->start_time,
                'end_time' => $request->end_time,
                'status' => $request->status,
                'updated_by' => Auth::id()
            ]);

            return response()->json([
                'success' => true,
                'message' => 'Session updated successfully',
                'data' => $session
            ]);
        } catch (\Exception $e) {
            return response()->json([
                'success' => false,
                'message' => 'Failed to update session',
                'error' => $e->getMessage()
            ], 500);
        }
    }

    /**
     * Delete session (soft delete)
     */
    public function destroy($id)
    {
        try {
            $session = SessionMaster::find($id);

            if (!$session) {
                return response()->json([
                    'success' => false,
                    'message' => 'Session not found'
                ], 404);
            }

            $session->delete();

            return response()->json([
                'success' => true,
                'message' => 'Session deleted successfully'
            ]);
        } catch (\Exception $e) {
            return response()->json([
                'success' => false,
                'message' => 'Failed to delete session',
                'error' => $e->getMessage()
            ], 500);
        }
    }

    /**
     * Get active sessions (for dropdowns)
     */
    public function getActiveSessions()
    {
        try {
            $sessions = SessionMaster::active()
                ->select('id', 'session_name', 'session_name_chinese', 'duration_hours', 'amount')
                ->orderBy('duration_hours')
                ->get();

            // Add formatted attributes
            $sessions->transform(function ($session) {
                $session->duration_formatted = $session->duration_formatted;
                $session->amount_formatted = $session->amount_formatted;
                return $session;
            });

            return response()->json([
                'success' => true,
                'data' => $sessions
            ]);
        } catch (\Exception $e) {
            return response()->json([
                'success' => false,
                'message' => 'Failed to fetch active sessions',
                'error' => $e->getMessage()
            ], 500);
        }
    }
}