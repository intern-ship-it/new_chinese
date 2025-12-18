<?php

namespace App\Http\Controllers;

use App\Models\OccasionService;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Log;
use Illuminate\Support\Facades\Validator;
use Exception;

class OccasionServiceController extends Controller
{
    /**
     * Get all occasion services
     */
    public function index(Request $request)
    {
        try {
            $query = OccasionService::query();

            // Filter by status
            if ($request->filled('status')) {
                $query->where('status', $request->status);
            }

            // Search
            if ($request->filled('search')) {
                $search = $request->search;
                $query->where(function ($q) use ($search) {
                    $q->where('name', 'ILIKE', "%{$search}%")
                      ->orWhere('name_secondary', 'ILIKE', "%{$search}%");
                });
            }

            $services = $query->orderBy('sort_order')
                              ->orderBy('name')
                              ->get();

            return response()->json([
                'success' => true,
                'data' => $services,
                'count' => $services->count()
            ], 200);

        } catch (Exception $e) {
            Log::error('Error fetching occasion services: ' . $e->getMessage());
            return response()->json([
                'success' => false,
                'message' => 'Failed to fetch services',
                'error' => $e->getMessage()
            ], 500);
        }
    }

    /**
     * Get single service
     */
    public function show($id)
    {
        try {
            $service = OccasionService::find($id);

            if (!$service) {
                return response()->json([
                    'success' => false,
                    'message' => 'Service not found'
                ], 404);
            }

            return response()->json([
                'success' => true,
                'data' => $service
            ], 200);

        } catch (Exception $e) {
            Log::error('Error fetching service: ' . $e->getMessage());
            return response()->json([
                'success' => false,
                'message' => 'Failed to fetch service'
            ], 500);
        }
    }

    /**
     * Create new service
     */
    public function store(Request $request)
    {
        try {
            $validator = Validator::make($request->all(), [
                'name' => 'required|string|max:255',
                'name_secondary' => 'nullable|string|max:255',
                'description' => 'nullable|string',
                'amount' => 'required|numeric|min:0',
                'ledger_id' => 'nullable|integer|exists:ledgers,id',
                'status' => 'nullable|in:active,inactive',
                'sort_order' => 'nullable|integer'
            ]);

            if ($validator->fails()) {
                return response()->json([
                    'success' => false,
                    'message' => 'Validation error',
                    'errors' => $validator->errors()
                ], 422);
            }

            $service = OccasionService::create([
                'name' => $request->name,
                'name_secondary' => $request->name_secondary,
                'description' => $request->description,
                'amount' => $request->amount,
                'ledger_id' => $request->ledger_id,
                'status' => $request->status ?? 'active',
                'sort_order' => $request->sort_order ?? 0
            ]);

            return response()->json([
                'success' => true,
                'message' => 'Service created successfully',
                'data' => $service
            ], 201);

        } catch (Exception $e) {
            Log::error('Error creating service: ' . $e->getMessage());
            return response()->json([
                'success' => false,
                'message' => 'Failed to create service',
                'error' => $e->getMessage()
            ], 500);
        }
    }

    /**
     * Update service
     */
    public function update(Request $request, $id)
    {
        try {
            $service = OccasionService::find($id);

            if (!$service) {
                return response()->json([
                    'success' => false,
                    'message' => 'Service not found'
                ], 404);
            }

            $validator = Validator::make($request->all(), [
                'name' => 'sometimes|required|string|max:255',
                'name_secondary' => 'nullable|string|max:255',
                'description' => 'nullable|string',
                'amount' => 'sometimes|required|numeric|min:0',
                'ledger_id' => 'nullable|integer|exists:ledgers,id',
                'status' => 'nullable|in:active,inactive',
                'sort_order' => 'nullable|integer'
            ]);

            if ($validator->fails()) {
                return response()->json([
                    'success' => false,
                    'message' => 'Validation error',
                    'errors' => $validator->errors()
                ], 422);
            }

            $service->update([
                'name' => $request->name ?? $service->name,
                'name_secondary' => $request->name_secondary,
                'description' => $request->description,
                'amount' => $request->amount ?? $service->amount,
                'ledger_id' => $request->ledger_id,
                'status' => $request->status ?? $service->status,
                'sort_order' => $request->sort_order ?? $service->sort_order
            ]);

            return response()->json([
                'success' => true,
                'message' => 'Service updated successfully',
                'data' => $service
            ], 200);

        } catch (Exception $e) {
            Log::error('Error updating service: ' . $e->getMessage());
            return response()->json([
                'success' => false,
                'message' => 'Failed to update service',
                'error' => $e->getMessage()
            ], 500);
        }
    }

    /**
     * Delete service
     */
    public function destroy($id)
    {
        try {
            $service = OccasionService::find($id);

            if (!$service) {
                return response()->json([
                    'success' => false,
                    'message' => 'Service not found'
                ], 404);
            }

            $service->delete();

            return response()->json([
                'success' => true,
                'message' => 'Service deleted successfully'
            ], 200);

        } catch (Exception $e) {
            Log::error('Error deleting service: ' . $e->getMessage());
            return response()->json([
                'success' => false,
                'message' => 'Failed to delete service'
            ], 500);
        }
    }

    /**
     * Update status
     */
    public function updateStatus(Request $request, $id)
    {
        try {
            $service = OccasionService::find($id);

            if (!$service) {
                return response()->json([
                    'success' => false,
                    'message' => 'Service not found'
                ], 404);
            }

            $validator = Validator::make($request->all(), [
                'status' => 'required|in:active,inactive'
            ]);

            if ($validator->fails()) {
                return response()->json([
                    'success' => false,
                    'message' => 'Invalid status'
                ], 422);
            }

            $service->update(['status' => $request->status]);

            return response()->json([
                'success' => true,
                'message' => "Status updated to {$request->status}",
                'data' => $service
            ], 200);

        } catch (Exception $e) {
            Log::error('Error updating status: ' . $e->getMessage());
            return response()->json([
                'success' => false,
                'message' => 'Failed to update status'
            ], 500);
        }
    }

    /**
     * Get active services for dropdown
     */
    public function getActive()
    {
        try {
            $services = OccasionService::active()
                                       ->ordered()
                                       ->get(['id', 'name', 'name_secondary', 'amount']);

            return response()->json([
                'success' => true,
                'data' => $services
            ], 200);

        } catch (Exception $e) {
            return response()->json([
                'success' => false,
                'message' => 'Failed to fetch services'
            ], 500);
        }
    }
}