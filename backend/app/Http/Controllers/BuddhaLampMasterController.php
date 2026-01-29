<?php

namespace App\Http\Controllers;

use App\Models\BuddhaLampMaster;
use App\Models\Ledger;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Log;
use Illuminate\Support\Facades\Validator;

class BuddhaLampMasterController extends Controller
{
    /**
     * Display a listing of Buddha Lamp Masters
     *
     * @param Request $request
     * @return \Illuminate\Http\JsonResponse
     */
    public function index(Request $request)
    {
        try {
            $query = BuddhaLampMaster::with(['ledger', 'creator', 'updater']);

            // Apply filters
            if ($request->has('status') && $request->status !== '') {
                $query->where('status', $request->status);
            }

            if ($request->has('search') && $request->search) {
                $search = $request->search;
                $query->where(function ($q) use ($search) {
                    $q->where('name', 'ILIKE', "%{$search}%")
                        ->orWhere('secondary_name', 'ILIKE', "%{$search}%")
                        ->orWhere('details', 'ILIKE', "%{$search}%");
                });
            }

            // Sorting
            $sortBy = $request->get('sort_by', 'created_at');
            $sortOrder = $request->get('sort_order', 'desc');
            $query->orderBy($sortBy, $sortOrder);

            // Pagination
            $perPage = $request->get('per_page', 15);
            $masters = $query->paginate($perPage);

            // Format response
            $formattedMasters = $masters->getCollection()->map(function ($master) {
                return $this->formatMasterResponse($master);
            });

            return response()->json([
                'success' => true,
                'data' => $formattedMasters,
                'pagination' => [
                    'current_page' => $masters->currentPage(),
                    'last_page' => $masters->lastPage(),
                    'per_page' => $masters->perPage(),
                    'total' => $masters->total()
                ]
            ]);
        } catch (\Exception $e) {
            Log::error('Failed to fetch Buddha Lamp Masters', [
                'error' => $e->getMessage(),
                'trace' => $e->getTraceAsString()
            ]);

            return response()->json([
                'success' => false,
                'message' => 'Failed to fetch Buddha Lamp Masters'
            ], 500);
        }
    }

    /**
     * Get active Buddha Lamp Masters (for dropdowns)
     *
     * @return \Illuminate\Http\JsonResponse
     */
    public function getActiveTypes()
    {
        try {
            $masters = BuddhaLampMaster::where('status', 1)
                ->orderBy('name')
                ->get(['id', 'name', 'secondary_name', 'ledger_id', 'amount']);

            $formattedMasters = $masters->map(function ($master) {
                return [
                    'id' => $master->id,
                    'name' => $master->name,
                    'secondary_name' => $master->secondary_name,
                    'ledger_id' => $master->ledger_id,
                    'amount' => (float) $master->amount,
                    'display_name' => $master->secondary_name
                        ? "{$master->name} / {$master->secondary_name}"
                        : $master->name,
                ];
            });

            return response()->json([
                'success' => true,
                'data' => $formattedMasters
            ]);
        } catch (\Exception $e) {
            Log::error('Failed to fetch active Buddha Lamp Masters', [
                'error' => $e->getMessage()
            ]);

            return response()->json([
                'success' => false,
                'message' => 'Failed to fetch active types'
            ], 500);
        }
    }

    /**
     * Get available ledgers for selection
     *
     * @return \Illuminate\Http\JsonResponse
     */
    // public function getLedgers()
    // {
    //     try {
    //         // Get income ledgers (typically where Buddha Lamp revenue is recorded)
    //         $ledgers = DB::table('ledgers')
    //             ->whereNull('deleted_at')
    //             ->select('id', 'name', 'left_code', 'right_code', 'type')
    //             ->orderBy('name')
    //             ->get();

    //         return response()->json([
    //             'success' => true,
    //             'data' => $ledgers
    //         ]);

    //     } catch (\Exception $e) {
    //         Log::error('Failed to fetch ledgers', [
    //             'error' => $e->getMessage()
    //         ]);

    //         return response()->json([
    //             'success' => false,
    //             'message' => 'Failed to fetch ledgers'
    //         ], 500);
    //     }
    // }
    public function getLedgers()
    {
        try {
            $ledgers = DB::table('ledgers')
                ->whereNull('deleted_at')
                ->where('left_code', '>=', '4000')
                ->where('left_code', '<=', '4999')
                ->orderBy('name')
                ->select('id', 'name')
                ->get();


            return response()->json([
                'success' => true,
                'data' => $ledgers,
                'count' => $ledgers->count()
            ]);
        } catch (\Exception $e) {
            \Log::error('Error fetching buddha-lamp ledgers: ' . $e->getMessage());

            return response()->json([
                'success' => false,
                'message' => 'Failed to fetch buddha-lamp ledgers',
                'error' => $e->getMessage()
            ], 500);
        }
    }
    /**
     * Display the specified Buddha Lamp Master
     *
     * @param string $id
     * @return \Illuminate\Http\JsonResponse
     */
    public function show($id)
    {
        try {
            $master = BuddhaLampMaster::with(['ledger', 'creator', 'updater'])
                ->findOrFail($id);

            return response()->json([
                'success' => true,
                'data' => $this->formatMasterResponse($master)
            ]);
        } catch (\Exception $e) {
            Log::error('Failed to fetch Buddha Lamp Master', [
                'id' => $id,
                'error' => $e->getMessage()
            ]);

            return response()->json([
                'success' => false,
                'message' => 'Buddha Lamp Master not found'
            ], 404);
        }
    }

    /**
     * Store a newly created Buddha Lamp Master
     *
     * @param Request $request
     * @return \Illuminate\Http\JsonResponse
     */
    public function store(Request $request)
    {
        // Validation
        $validator = Validator::make($request->all(), [
            'name' => 'required|string|max:300',
            'secondary_name' => 'nullable|string|max:300',
            'details' => 'nullable|string',
            'ledger_id' => 'required|exists:ledgers,id',
            'amount' => 'required|numeric|min:0|max:999999.99',
            'status' => 'required|in:0,1',
        ]);

        if ($validator->fails()) {
            return response()->json([
                'success' => false,
                'message' => 'Validation failed',
                'errors' => $validator->errors()
            ], 422);
        }

        DB::beginTransaction();

        try {
            $user = $request->user();

            // Create Buddha Lamp Master
            $master = BuddhaLampMaster::create([
                'name' => $request->name,
                'secondary_name' => $request->secondary_name,
                'amount' => $request->amount,
                'details' => $request->details,
                'ledger_id' => $request->ledger_id,
                'status' => $request->status,
                'created_by' => $user->id,
            ]);

            DB::commit();

            // Load relationships
            $master->load(['ledger', 'creator']);

            return response()->json([
                'success' => true,
                'message' => 'Buddha Lamp Master created successfully',
                'data' => $this->formatMasterResponse($master)
            ], 201);
        } catch (\Exception $e) {
            DB::rollBack();

            Log::error('Failed to create Buddha Lamp Master', [
                'error' => $e->getMessage(),
                'trace' => $e->getTraceAsString(),
                'request' => $request->all()
            ]);

            return response()->json([
                'success' => false,
                'message' => 'Failed to create Buddha Lamp Master: ' . $e->getMessage()
            ], 500);
        }
    }

    /**
     * Update the specified Buddha Lamp Master
     *
     * @param Request $request
     * @param string $id
     * @return \Illuminate\Http\JsonResponse
     */
    public function update(Request $request, $id)
    {
        // Validation
        $validator = Validator::make($request->all(), [
            'name' => 'required|string|max:300',
            'secondary_name' => 'nullable|string|max:300',
            'details' => 'nullable|string',
            'amount' => 'required|numeric|min:0|max:999999.99',
            'ledger_id' => 'required|exists:ledgers,id',
            'status' => 'required|in:0,1',
        ]);

        if ($validator->fails()) {
            return response()->json([
                'success' => false,
                'message' => 'Validation failed',
                'errors' => $validator->errors()
            ], 422);
        }

        DB::beginTransaction();

        try {
            $user = $request->user();

            $master = BuddhaLampMaster::findOrFail($id);

            // Update Buddha Lamp Master
            $master->update([
                'name' => $request->name,
                'secondary_name' => $request->secondary_name,
                'amount' => $request->amount,
                'details' => $request->details,
                'ledger_id' => $request->ledger_id,
                'status' => $request->status,
                'updated_by' => $user->id,
            ]);

            DB::commit();

            // Load relationships
            $master->load(['ledger', 'creator', 'updater']);

            return response()->json([
                'success' => true,
                'message' => 'Buddha Lamp Master updated successfully',
                'data' => $this->formatMasterResponse($master)
            ]);
        } catch (\Exception $e) {
            DB::rollBack();

            Log::error('Failed to update Buddha Lamp Master', [
                'id' => $id,
                'error' => $e->getMessage(),
                'trace' => $e->getTraceAsString(),
                'request' => $request->all()
            ]);

            return response()->json([
                'success' => false,
                'message' => 'Failed to update Buddha Lamp Master: ' . $e->getMessage()
            ], 500);
        }
    }

    /**
     * Remove the specified Buddha Lamp Master (soft delete)
     *
     * @param string $id
     * @return \Illuminate\Http\JsonResponse
     */
    public function destroy($id)
    {
        DB::beginTransaction();

        try {
            $master = BuddhaLampMaster::findOrFail($id);

            // Check if master is being used in any bookings
            $usageCount = DB::table('booking_meta')
                ->where('meta_key', 'buddha_lamp_type_id')
                ->where('meta_value', $id)
                ->count();

            if ($usageCount > 0) {
                return response()->json([
                    'success' => false,
                    'message' => "Cannot delete: This Buddha Lamp type is used in {$usageCount} booking(s). Please deactivate instead."
                ], 400);
            }

            // Soft delete
            $master->delete();

            DB::commit();

            return response()->json([
                'success' => true,
                'message' => 'Buddha Lamp Master deleted successfully'
            ]);
        } catch (\Exception $e) {
            DB::rollBack();

            Log::error('Failed to delete Buddha Lamp Master', [
                'id' => $id,
                'error' => $e->getMessage()
            ]);

            return response()->json([
                'success' => false,
                'message' => 'Failed to delete Buddha Lamp Master'
            ], 500);
        }
    }

    /**
     * Get user permissions for Buddha Lamp Master module
     *
     * @param string $userId
     * @return \Illuminate\Http\JsonResponse
     */
    public function getUserPermissions($userId)
    {
        try {
            $user = \App\Models\User::with('roles.permissions')->findOrFail($userId);

            $permissions = [
                'can_view' => $user->hasPermissionTo('buddha_lamp_masters.view') || $user->user_type === 'SUPER_ADMIN',
                'can_create' => $user->hasPermissionTo('buddha_lamp_masters.create') || $user->user_type === 'SUPER_ADMIN',
                'can_edit' => $user->hasPermissionTo('buddha_lamp_masters.edit') || $user->user_type === 'SUPER_ADMIN',
                'can_delete' => $user->hasPermissionTo('buddha_lamp_masters.delete') || $user->user_type === 'SUPER_ADMIN',
            ];

            return response()->json([
                'success' => true,
                'data' => $permissions
            ]);
        } catch (\Exception $e) {
            return response()->json([
                'success' => false,
                'message' => 'Failed to fetch permissions'
            ], 500);
        }
    }

    /**
     * Format master response for API
     *
     * @param BuddhaLampMaster $master
     * @return array
     */
    private function formatMasterResponse($master)
    {
        return [
            'id' => $master->id,
            'name' => $master->name,
            'secondary_name' => $master->secondary_name,
            'details' => $master->details,
            'ledger_id' => $master->ledger_id,
            'amount' => (float) $master->amount, // ✅ ADDED THIS LINE
            'ledger' => $master->ledger ? [
                'id' => $master->ledger->id,
                'name' => $master->ledger->name,
                'code' => $master->ledger->code ?? null,
            ] : null,
            'status' => $master->status,
            'status_label' => $master->status == 1 ? 'Active' : 'Inactive',
            'created_at' => $master->created_at ? $master->created_at->format('Y-m-d H:i:s') : null,
            'updated_at' => $master->updated_at ? $master->updated_at->format('Y-m-d H:i:s') : null,
            'created_by' => $master->creator ? [
                'id' => $master->creator->id,
                'name' => $master->creator->name ?? $master->creator->username,
            ] : null,
            'updated_by' => $master->updater ? [
                'id' => $master->updater->id,
                'name' => $master->updater->name ?? $master->updater->username,
            ] : null,
        ];
    }
}
