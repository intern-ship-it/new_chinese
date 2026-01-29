<?php

namespace App\Http\Controllers;

use App\Models\RomVenueMaster;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Auth;
use Illuminate\Support\Facades\Validator;
use Illuminate\Support\Facades\Log;
use Illuminate\Support\Facades\DB;

class RomVenueMasterController extends Controller
{
    /**
     * List all ROM venues with pagination and filters.
     *
     * @param Request $request
     * @return \Illuminate\Http\JsonResponse
     */
    public function index(Request $request)
    {
        try {
            $query = RomVenueMaster::query();

            // Apply filters
            if ($request->filled('status')) {
                $query->where('status', $request->status);
            }

            if ($request->filled('search')) {
                $query->searchByName($request->search);
            }

            if ($request->filled('city')) {
                $query->filterByCity($request->city);
            }

            // Sorting
            $sortBy = $request->get('sort_by', 'created_at');
            $sortOrder = $request->get('sort_order', 'desc');
            $query->orderBy($sortBy, $sortOrder);

            // Pagination
            $perPage = $request->get('per_page', 10);
            $venues = $query->paginate($perPage);

            // Add additional info to each venue
            $venues->getCollection()->transform(function ($venue) {
                return [
                    'id' => $venue->id,
                    'name_primary' => $venue->name_primary,
                    'name_secondary' => $venue->name_secondary,
                    'formatted_name' => $venue->formatted_name,
                    'description' => $venue->description,
                    'city' => $venue->city,
                    'pincode' => $venue->pincode,
                    'status' => $venue->status,
                    'status_label' => $venue->status_label,
                    'status_badge_class' => $venue->status_badge_class,
                    'created_at' => $venue->created_at?->format('Y-m-d H:i:s'),
                    'updated_at' => $venue->updated_at?->format('Y-m-d H:i:s'),
                ];
            });

            return response()->json([
                'success' => true,
                'message' => 'ROM venues retrieved successfully',
                'data' => $venues
            ]);

        } catch (\Exception $e) {
            Log::error('ROM Venue Index Error: ' . $e->getMessage());
            return response()->json([
                'success' => false,
                'message' => 'Failed to retrieve ROM venues',
                'error' => $e->getMessage()
            ], 500);
        }
    }

    /**
     * Get active ROM venues (for dropdowns/selects).
     *
     * @return \Illuminate\Http\JsonResponse
     */
    public function getActiveVenues()
    {
        try {
            // Query with explicit column selection
            $venues = RomVenueMaster::where('status', 1)
                ->whereNull('deleted_at')
                ->select('id', 'name_primary', 'name_secondary','city')
                ->orderBy('name_primary')
                ->get();

            Log::info('ROM Venues - Active Venues Query:', [
                'count' => $venues->count(),
                'first_venue_id' => $venues->first()?->id,
                'first_venue_id_type' => $venues->first() ? gettype($venues->first()->id) : null
            ]);

            // Map to ensure proper format
            $formattedVenues = $venues->map(function ($venue) {
                return [
                    'id' => (string) $venue->id,  // ✅ Explicitly cast to string
                    'name_primary' => $venue->name_primary,
                    'name_secondary' => $venue->name_secondary,
                    'formatted_name' => $venue->formatted_name,
                    'city' => $venue->city
                ];
            });

            Log::info('ROM Venues - Formatted Response:', [
                'total_venues' => $formattedVenues->count(),
                'sample_venue' => $formattedVenues->first()
            ]);
            
            return response()->json([
                'success' => true,
                'data' => $formattedVenues->values() // Use values() to ensure JSON array format
            ]);
            
        } catch (\Exception $e) {
            Log::error('Get active venues error: ' . $e->getMessage(), [
                'trace' => $e->getTraceAsString()
            ]);
            
            return response()->json([
                'success' => false,
                'message' => 'Failed to load venues',
                'error' => $e->getMessage()
            ], 500);
        }
    }

    /**
     * Diagnostic endpoint to verify venue data structure
     * 
     * @return \Illuminate\Http\JsonResponse
     */
    public function diagnostic()
    {
        try {
            // Get raw database records
            $rawVenues = DB::table('rom_venue_masters')
                ->whereNull('deleted_at')
                ->where('status', 1)
                ->select('id', 'name_primary', 'name_secondary', 'status')
                ->limit(5)
                ->get();

            // Get via Eloquent
            $eloquentVenues = RomVenueMaster::where('status', 1)
                ->whereNull('deleted_at')
                ->limit(5)
                ->get();

            return response()->json([
                'success' => true,
                'raw_database' => $rawVenues,
                'eloquent_models' => $eloquentVenues->map(function($v) {
                    return [
                        'id' => $v->id,
                        'id_type' => gettype($v->id),
                        'id_length' => strlen($v->id),
                        'name' => $v->formatted_name,
                        'raw_attributes' => $v->getAttributes()
                    ];
                }),
                'database_check' => [
                    'table_exists' => DB::select("SELECT EXISTS (SELECT FROM information_schema.tables WHERE table_schema = 'public' AND table_name = 'rom_venue_masters')")[0]->exists,
                    'record_count' => DB::table('rom_venue_masters')->whereNull('deleted_at')->where('status', 1)->count()
                ]
            ]);

        } catch (\Exception $e) {
            return response()->json([
                'success' => false,
                'error' => $e->getMessage(),
                'trace' => $e->getTraceAsString()
            ], 500);
        }
    }

    /**
     * Get single ROM venue by ID.
     *
     * @param string $id
     * @return \Illuminate\Http\JsonResponse
     */
    public function show($id)
    {
        try {
            $venue = RomVenueMaster::findOrFail($id);

            return response()->json([
                'success' => true,
                'message' => 'ROM venue retrieved successfully',
                'data' => [
                    'id' => $venue->id,
                    'name_primary' => $venue->name_primary,
                    'name_secondary' => $venue->name_secondary,
                    'formatted_name' => $venue->formatted_name,
                    'description' => $venue->description,
                    'city' => $venue->city,
                    'pincode' => $venue->pincode,
                    'status' => $venue->status,
                    'status_label' => $venue->status_label,
                    'created_at' => $venue->created_at?->format('Y-m-d H:i:s'),
                    'updated_at' => $venue->updated_at?->format('Y-m-d H:i:s'),
                    'creator' => $venue->creator ? [
                        'id' => $venue->creator->id,
                        'name' => $venue->creator->name,
                    ] : null,
                    'updater' => $venue->updater ? [
                        'id' => $venue->updater->id,
                        'name' => $venue->updater->name,
                    ] : null,
                ]
            ]);

        } catch (\Exception $e) {
            Log::error('ROM Venue Show Error: ' . $e->getMessage());
            return response()->json([
                'success' => false,
                'message' => 'Failed to retrieve ROM venue',
                'error' => $e->getMessage()
            ], 404);
        }
    }

    /**
     * Create new ROM venue.
     *
     * @param Request $request
     * @return \Illuminate\Http\JsonResponse
     */
    public function store(Request $request)
    {
        try {
            // Validation
            $validator = Validator::make($request->all(), [
                'name_primary' => 'required|string|max:300',
                'name_secondary' => 'nullable|string|max:300',
                'description' => 'nullable|string',
                'city' => 'nullable|string|max:100',
                'pincode' => 'nullable|string|max:20',
                'status' => 'nullable|in:0,1',
            ]);

            if ($validator->fails()) {
                return response()->json([
                    'success' => false,
                    'message' => 'Validation failed',
                    'errors' => $validator->errors()
                ], 422);
            }

            // Create venue
            $venue = RomVenueMaster::create([
                'name_primary' => $request->name_primary,
                'name_secondary' => $request->name_secondary,
                'description' => $request->description,
                'city' => $request->city,
                'pincode' => $request->pincode,
                'status' => $request->get('status', 1),
                'created_by' => Auth::id(),
            ]);

            Log::info('ROM Venue Created:', [
                'venue_id' => $venue->id,
                'name' => $venue->formatted_name
            ]);

            return response()->json([
                'success' => true,
                'message' => 'ROM venue created successfully',
                'data' => [
                    'id' => $venue->id,
                    'name_primary' => $venue->name_primary,
                    'name_secondary' => $venue->name_secondary,
                    'formatted_name' => $venue->formatted_name,
                    'description' => $venue->description,
                    'city' => $venue->city,
                    'pincode' => $venue->pincode,
                    'status' => $venue->status,
                ]
            ], 201);

        } catch (\Exception $e) {
            Log::error('ROM Venue Store Error: ' . $e->getMessage());
            return response()->json([
                'success' => false,
                'message' => 'Failed to create ROM venue',
                'error' => $e->getMessage()
            ], 500);
        }
    }

    /**
     * Update ROM venue.
     *
     * @param Request $request
     * @param string $id
     * @return \Illuminate\Http\JsonResponse
     */
    public function update(Request $request, $id)
    {
        try {
            $venue = RomVenueMaster::findOrFail($id);

            // Validation
            $validator = Validator::make($request->all(), [
                'name_primary' => 'required|string|max:300',
                'name_secondary' => 'nullable|string|max:300',
                'description' => 'nullable|string',
                'city' => 'nullable|string|max:100',
                'pincode' => 'nullable|string|max:20',
                'status' => 'nullable|in:0,1',
            ]);

            if ($validator->fails()) {
                return response()->json([
                    'success' => false,
                    'message' => 'Validation failed',
                    'errors' => $validator->errors()
                ], 422);
            }

            // Update venue
            $venue->update([
                'name_primary' => $request->name_primary,
                'name_secondary' => $request->name_secondary,
                'description' => $request->description,
                'city' => $request->city,
                'pincode' => $request->pincode,
                'status' => $request->get('status', $venue->status),
                'updated_by' => Auth::id(),
            ]);

            return response()->json([
                'success' => true,
                'message' => 'ROM venue updated successfully',
                'data' => [
                    'id' => $venue->id,
                    'name_primary' => $venue->name_primary,
                    'name_secondary' => $venue->name_secondary,
                    'formatted_name' => $venue->formatted_name,
                    'description' => $venue->description,
                    'city' => $venue->city,
                    'pincode' => $venue->pincode,
                    'status' => $venue->status,
                ]
            ]);

        } catch (\Exception $e) {
            Log::error('ROM Venue Update Error: ' . $e->getMessage());
            return response()->json([
                'success' => false,
                'message' => 'Failed to update ROM venue',
                'error' => $e->getMessage()
            ], 500);
        }
    }

    /**
     * Delete ROM venue (soft delete).
     *
     * @param string $id
     * @return \Illuminate\Http\JsonResponse
     */
    public function destroy($id)
    {
        try {
            $venue = RomVenueMaster::findOrFail($id);

            // Check if venue is used in any sessions
            $usageCount = DB::table('rom_session_masters')
                ->whereNull('deleted_at')
                ->whereRaw("venue_ids::jsonb @> ?", [json_encode([$venue->id])])
                ->count();

            if ($usageCount > 0) {
                return response()->json([
                    'success' => false,
                    'message' => 'Cannot delete venue. It is being used in ' . $usageCount . ' session(s).',
                ], 422);
            }

            $venue->update(['deleted_by' => Auth::id()]);
            $venue->delete();

            return response()->json([
                'success' => true,
                'message' => 'ROM venue deleted successfully'
            ]);

        } catch (\Exception $e) {
            Log::error('ROM Venue Delete Error: ' . $e->getMessage());
            return response()->json([
                'success' => false,
                'message' => 'Failed to delete ROM venue',
                'error' => $e->getMessage()
            ], 500);
        }
    }

    /**
     * Get user permissions for ROM venue management.
     *
     * @param Request $request
     * @param string $userId
     * @return \Illuminate\Http\JsonResponse
     */
    public function getUserPermissions(Request $request, $userId)
    {
        try {
            $user = \App\Models\User::findOrFail($userId);
            
            $permissions = [
                'can_view' => $user->can('view_rom_venues') || $user->hasRole(['super_admin', 'admin']),
                'can_create' => $user->can('create_rom_venues') || $user->hasRole(['super_admin', 'admin']),
                'can_edit' => $user->can('edit_rom_venues') || $user->hasRole(['super_admin', 'admin']),
                'can_delete' => $user->can('delete_rom_venues') || $user->hasRole(['super_admin']),
            ];

            return response()->json([
                'success' => true,
                'data' => $permissions
            ]);

        } catch (\Exception $e) {
            Log::error('ROM Venue Permissions Error: ' . $e->getMessage());
            return response()->json([
                'success' => false,
                'message' => 'Failed to retrieve user permissions',
                'error' => $e->getMessage()
            ], 500);
        }
    }
}