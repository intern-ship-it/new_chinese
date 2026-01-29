<?php

namespace App\Http\Controllers;

use App\Models\RomSessionMaster;
use App\Models\RomVenueMaster;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Auth;
use Illuminate\Support\Facades\Validator;
use Illuminate\Support\Facades\Log;

class RomSessionMasterController extends Controller
{
    /**
     * List all ROM sessions with pagination and filters.
     */
    public function index(Request $request)
    {
        try {
            $query = RomSessionMaster::query();

            // Apply filters
            if ($request->filled('status')) {
                $query->where('status', $request->status);
            }

            if ($request->filled('search')) {
                $query->searchByName($request->search);
            }

            if ($request->filled('venue_id')) {
                $query->byVenue($request->venue_id);
            }

            // Sorting
            $sortBy = $request->get('sort_by', 'from_time');
            $sortOrder = $request->get('sort_order', 'asc');
            $query->orderBy($sortBy, $sortOrder);

            // Pagination
            $perPage = $request->get('per_page', 10);
            $sessions = $query->paginate($perPage);

            // Transform data
            $sessions->getCollection()->transform(function ($session) {
                $venues = $session->venues();
                
                return [
                    'id' => $session->id,
                    'name_primary' => $session->name_primary,
                    'name_secondary' => $session->name_secondary,
                    'formatted_name' => $session->formatted_name,
                    'description' => $session->description,
                    'from_time' => $session->from_time,
                    'to_time' => $session->to_time,
                    'formatted_time' => $session->formatted_time,
                    'venue_ids' => $session->venue_ids,
                    'venue_names' => $session->venue_names,
                    'venues' => $venues->map(function($v) {
                        return [
                            'id' => $v->id,
                            'name' => $v->formatted_name
                        ];
                    }),
                    'amount' => $session->amount,
                    'formatted_amount' => $session->formatted_amount,
                    'max_members' => $session->max_members,
                    'status' => $session->status,
                    'status_label' => $session->status_label,
                    'status_badge_class' => $session->status_badge_class,
                    'created_at' => $session->created_at?->format('Y-m-d H:i:s'),
                    'updated_at' => $session->updated_at?->format('Y-m-d H:i:s'),
                ];
            });

            return response()->json([
                'success' => true,
                'message' => 'ROM sessions retrieved successfully',
                'data' => $sessions
            ]);

        } catch (\Exception $e) {
            Log::error('ROM Session Index Error: ' . $e->getMessage());
            return response()->json([
                'success' => false,
                'message' => 'Failed to retrieve ROM sessions',
                'error' => $e->getMessage()
            ], 500);
        }
    }

    /**
     * Get active ROM sessions (for dropdowns/selects).
     */
    public function getActiveSessions()
    {
        try {
            $sessions = RomSessionMaster::active()
                ->orderBy('from_time')
                ->get()
                ->map(function ($session) {
                    return [
                        'id' => $session->id,
                        'name_primary' => $session->name_primary,
                        'name_secondary' => $session->name_secondary,
                        'formatted_name' => $session->formatted_name,
                        'formatted_time' => $session->formatted_time,
                        'from_time' => $session->from_time,
                        'to_time' => $session->to_time,
                        'amount' => $session->amount,
                        'max_members' => $session->max_members,
                        'venue_ids' => $session->venue_ids,
                    ];
                });

            return response()->json([
                'success' => true,
                'message' => 'Active ROM sessions retrieved successfully',
                'data' => $sessions
            ]);

        } catch (\Exception $e) {
            Log::error('ROM Session Active List Error: ' . $e->getMessage());
            return response()->json([
                'success' => false,
                'message' => 'Failed to retrieve active ROM sessions',
                'error' => $e->getMessage()
            ], 500);
        }
    }

    /**
     * Get single ROM session by ID.
     */
    public function show($id)
    {
        try {
            $session = RomSessionMaster::findOrFail($id);
            $venues = $session->venues();

            return response()->json([
                'success' => true,
                'message' => 'ROM session retrieved successfully',
                'data' => [
                    'id' => $session->id,
                    'name_primary' => $session->name_primary,
                    'name_secondary' => $session->name_secondary,
                    'formatted_name' => $session->formatted_name,
                    'description' => $session->description,
                    'from_time' => $session->from_time,
                    'to_time' => $session->to_time,
                    'formatted_time' => $session->formatted_time,
                    'venue_ids' => $session->venue_ids,
                    'venues' => $venues->map(function($v) {
                        return [
                            'id' => $v->id,
                            'name' => $v->formatted_name
                        ];
                    }),
                    'amount' => $session->amount,
                    'max_members' => $session->max_members,
                    'status' => $session->status,
                    'status_label' => $session->status_label,
                    'created_at' => $session->created_at?->format('Y-m-d H:i:s'),
                    'updated_at' => $session->updated_at?->format('Y-m-d H:i:s'),
                    'creator' => $session->creator ? [
                        'id' => $session->creator->id,
                        'name' => $session->creator->name,
                    ] : null,
                    'updater' => $session->updater ? [
                        'id' => $session->updater->id,
                        'name' => $session->updater->name,
                    ] : null,
                ]
            ]);

        } catch (\Exception $e) {
            Log::error('ROM Session Show Error: ' . $e->getMessage());
            return response()->json([
                'success' => false,
                'message' => 'Failed to retrieve ROM session',
                'error' => $e->getMessage()
            ], 404);
        }
    }

    /**
     * Create new ROM session.
     */
    public function store(Request $request)
    {
        try {
            // Log incoming data for debugging
            Log::info('ROM Session Store - Incoming Data:', [
                'venue_ids' => $request->venue_ids,
                'venue_ids_type' => gettype($request->venue_ids),
                'venue_ids_count' => is_array($request->venue_ids) ? count($request->venue_ids) : 0,
                'all_data' => $request->all()
            ]);

            // Step 1: Basic validation (structure and format)
            $validator = Validator::make($request->all(), [
                'name_primary' => 'required|string|max:300',
                'name_secondary' => 'nullable|string|max:300',
                'description' => 'nullable|string',
                'from_time' => 'required|date_format:H:i',
                'to_time' => 'required|date_format:H:i|after:from_time',
                'venue_ids' => 'required|array|min:1',
                'venue_ids.*' => 'required|string|uuid', // Validate each is a UUID string
                'amount' => 'required|numeric|min:0',
                'max_members' => 'required|integer|min:1',
                'status' => 'nullable|in:0,1',
            ]);

            if ($validator->fails()) {
                Log::error('ROM Session Store - Basic Validation Failed:', [
                    'errors' => $validator->errors()->toArray()
                ]);
                
                return response()->json([
                    'success' => false,
                    'message' => 'Validation failed',
                    'errors' => $validator->errors()
                ], 422);
            }

            // Step 2: Check if venues exist and are active
            $venueIds = $request->venue_ids;
            
            Log::info('ROM Session Store - Checking Venues:', [
                'requested_venue_ids' => $venueIds,
                'count' => count($venueIds)
            ]);

            // Query active venues
            $existingVenues = RomVenueMaster::whereIn('id', $venueIds)
                ->where('status', 1)
                ->whereNull('deleted_at')
                ->pluck('id')
                ->toArray();

            Log::info('ROM Session Store - Venue Check Results:', [
                'requested_venues' => $venueIds,
                'existing_venues' => $existingVenues,
                'requested_count' => count($venueIds),
                'existing_count' => count($existingVenues)
            ]);

            // Check if all requested venues exist
            if (count($existingVenues) !== count($venueIds)) {
                $missingVenues = array_diff($venueIds, $existingVenues);
                
                Log::error('ROM Session Store - Missing/Invalid Venues:', [
                    'missing_venue_ids' => array_values($missingVenues)
                ]);
                
                return response()->json([
                    'success' => false,
                    'message' => 'One or more selected venues are invalid, inactive, or do not exist',
                    'errors' => [
                        'venue_ids' => [
                            'Some selected venues are invalid. Please check your selection and try again.',
                            'Missing venue IDs: ' . implode(', ', $missingVenues)
                        ]
                    ]
                ], 422);
            }

            // Step 3: Create session
            $session = RomSessionMaster::create([
                'name_primary' => $request->name_primary,
                'name_secondary' => $request->name_secondary,
                'description' => $request->description,
                'from_time' => $request->from_time,
                'to_time' => $request->to_time,
                'venue_ids' => $venueIds, // Store as JSON array
                'amount' => $request->amount,
                'max_members' => $request->max_members,
                'status' => $request->get('status', 1),
                'created_by' => Auth::id(),
            ]);

            Log::info('ROM Session Store - Success:', [
                'session_id' => $session->id,
                'venue_ids_saved' => $session->venue_ids
            ]);

            return response()->json([
                'success' => true,
                'message' => 'ROM session created successfully',
                'data' => [
                    'id' => $session->id,
                    'name_primary' => $session->name_primary,
                    'name_secondary' => $session->name_secondary,
                    'formatted_name' => $session->formatted_name,
                    'formatted_time' => $session->formatted_time,
                    'amount' => $session->amount,
                    'max_members' => $session->max_members,
                    'venue_ids' => $session->venue_ids,
                    'status' => $session->status,
                ]
            ], 201);

        } catch (\Exception $e) {
            Log::error('ROM Session Store Error: ' . $e->getMessage(), [
                'trace' => $e->getTraceAsString()
            ]);
            
            return response()->json([
                'success' => false,
                'message' => 'Failed to create ROM session',
                'error' => $e->getMessage()
            ], 500);
        }
    }

    /**
     * Update ROM session.
     */
    public function update(Request $request, $id)
    {
        try {
            $session = RomSessionMaster::findOrFail($id);

            // Log incoming data
            Log::info('ROM Session Update - Incoming Data:', [
                'session_id' => $id,
                'venue_ids' => $request->venue_ids,
                'venue_ids_type' => gettype($request->venue_ids)
            ]);

            // Step 1: Basic validation
            $validator = Validator::make($request->all(), [
                'name_primary' => 'required|string|max:300',
                'name_secondary' => 'nullable|string|max:300',
                'description' => 'nullable|string',
                'from_time' => 'required|date_format:H:i',
                'to_time' => 'required|date_format:H:i|after:from_time',
                'venue_ids' => 'required|array|min:1',
                'venue_ids.*' => 'required|string|uuid',
                'amount' => 'required|numeric|min:0',
                'max_members' => 'required|integer|min:1',
                'status' => 'nullable|in:0,1',
            ]);

            if ($validator->fails()) {
                Log::error('ROM Session Update - Validation Failed:', [
                    'errors' => $validator->errors()->toArray()
                ]);
                
                return response()->json([
                    'success' => false,
                    'message' => 'Validation failed',
                    'errors' => $validator->errors()
                ], 422);
            }

            // Step 2: Check if venues exist and are active
            $venueIds = $request->venue_ids;
            
            $existingVenues = RomVenueMaster::whereIn('id', $venueIds)
                ->where('status', 1)
                ->whereNull('deleted_at')
                ->pluck('id')
                ->toArray();

            if (count($existingVenues) !== count($venueIds)) {
                $missingVenues = array_diff($venueIds, $existingVenues);
                
                Log::error('ROM Session Update - Missing Venues:', [
                    'missing' => array_values($missingVenues)
                ]);
                
                return response()->json([
                    'success' => false,
                    'message' => 'One or more selected venues are invalid or inactive',
                    'errors' => [
                        'venue_ids' => [
                            'Some selected venues are invalid. Please check your selection.',
                            'Missing venue IDs: ' . implode(', ', $missingVenues)
                        ]
                    ]
                ], 422);
            }

            // Step 3: Update session
            $session->update([
                'name_primary' => $request->name_primary,
                'name_secondary' => $request->name_secondary,
                'description' => $request->description,
                'from_time' => $request->from_time,
                'to_time' => $request->to_time,
                'venue_ids' => $venueIds,
                'amount' => $request->amount,
                'max_members' => $request->max_members,
                'status' => $request->get('status', $session->status),
                'updated_by' => Auth::id(),
            ]);

            Log::info('ROM Session Update - Success:', [
                'session_id' => $session->id
            ]);

            return response()->json([
                'success' => true,
                'message' => 'ROM session updated successfully',
                'data' => [
                    'id' => $session->id,
                    'name_primary' => $session->name_primary,
                    'name_secondary' => $session->name_secondary,
                    'formatted_name' => $session->formatted_name,
                    'formatted_time' => $session->formatted_time,
                    'amount' => $session->amount,
                    'max_members' => $session->max_members,
                    'venue_ids' => $session->venue_ids,
                    'status' => $session->status,
                ]
            ]);

        } catch (\Exception $e) {
            Log::error('ROM Session Update Error: ' . $e->getMessage());
            return response()->json([
                'success' => false,
                'message' => 'Failed to update ROM session',
                'error' => $e->getMessage()
            ], 500);
        }
    }

    /**
     * Delete ROM session (soft delete).
     */
    public function destroy($id)
    {
        try {
            $session = RomSessionMaster::findOrFail($id);

            // Check if session is used in any bookings (implement this check when you have bookings)
            // Example: if ($session->bookings()->exists()) { ... }

            $session->update(['deleted_by' => Auth::id()]);
            $session->delete();

            return response()->json([
                'success' => true,
                'message' => 'ROM session deleted successfully'
            ]);

        } catch (\Exception $e) {
            Log::error('ROM Session Delete Error: ' . $e->getMessage());
            return response()->json([
                'success' => false,
                'message' => 'Failed to delete ROM session',
                'error' => $e->getMessage()
            ], 500);
        }
    }

    /**
     * Get user permissions for ROM session management.
     */
    public function getUserPermissions(Request $request, $userId)
    {
        try {
            $user = \App\Models\User::findOrFail($userId);
            
            $permissions = [
                'can_view' => $user->can('view_rom_sessions') || $user->hasRole(['super_admin', 'admin']),
                'can_create' => $user->can('create_rom_sessions') || $user->hasRole(['super_admin', 'admin']),
                'can_edit' => $user->can('edit_rom_sessions') || $user->hasRole(['super_admin', 'admin']),
                'can_delete' => $user->can('delete_rom_sessions') || $user->hasRole(['super_admin']),
            ];

            return response()->json([
                'success' => true,
                'data' => $permissions
            ]);

        } catch (\Exception $e) {
            Log::error('ROM Session Permissions Error: ' . $e->getMessage());
            return response()->json([
                'success' => false,
                'message' => 'Failed to retrieve user permissions',
                'error' => $e->getMessage()
            ], 500);
        }
    }
}