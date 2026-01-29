<?php

namespace App\Http\Controllers;

use App\Models\TempleFloor;
use App\Traits\ApiResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Validator;
use Illuminate\Support\Facades\DB;

class FloorController extends Controller
{
    use ApiResponse;

    /**
     * Get all floors for a temple
     * GET /api/v1/floors
     */
    public function index(Request $request)
    {
        try {
            $temple = $request->input('current_temple');
            
            $floors = TempleFloor::forTemple($temple['id'])
                ->active()
                ->ordered()
                ->get();

            return $this->successResponse($floors, 'Floors retrieved successfully');
        } catch (\Exception $e) {
            return $this->errorResponse('Failed to retrieve floors: ' . $e->getMessage(), 500);
        }
    }

    /**
     * Get all floors including inactive
     * GET /api/v1/floors/all
     */
    public function all(Request $request)
    {
        try {
            $temple = $request->input('current_temple');
            
            $floors = TempleFloor::forTemple($temple['id'])
                ->ordered()
                ->get();

            return $this->successResponse($floors, 'All floors retrieved successfully');
        } catch (\Exception $e) {
            return $this->errorResponse('Failed to retrieve floors: ' . $e->getMessage(), 500);
        }
    }

    /**
     * Get a single floor
     * GET /api/v1/floors/{id}
     */
    public function show(Request $request, $id)
    {
        try {
            $temple = $request->input('current_temple');
            
            $floor = TempleFloor::forTemple($temple['id'])
                ->where('floor_id', $id)
                ->with(['deities', 'lightConfigs'])
                ->first();

            if (!$floor) {
                return $this->errorResponse('Floor not found', 404);
            }

            return $this->successResponse($floor, 'Floor retrieved successfully');
        } catch (\Exception $e) {
            return $this->errorResponse('Failed to retrieve floor: ' . $e->getMessage(), 500);
        }
    }

    /**
     * Create a new floor
     * POST /api/v1/floors
     */
    public function store(Request $request)
    {
        try {
            $temple = $request->input('current_temple');
            
            $validator = Validator::make($request->all(), [
                'floor_name' => 'required|string|max:100',
                'floor_code' => 'nullable|string|max:20',
                'floor_name_chinese' => 'nullable|string|max:100',
                'description' => 'nullable|string',
                'sort_order' => 'nullable|integer',
                'is_active' => 'nullable|boolean'
            ]);

            if ($validator->fails()) {
                return $this->errorResponse($validator->errors()->first(), 422);
            }

            $floor = TempleFloor::create([
                'temple_id' => $temple['id'],
                'floor_name' => $request->floor_name,
                'floor_code' => $request->floor_code,
                'floor_name_chinese' => $request->floor_name_chinese,
                'description' => $request->description,
                'sort_order' => $request->sort_order ?? 0,
                'is_active' => $request->is_active ?? true,
                'created_by' => auth()->id()
            ]);

            return $this->successResponse($floor, 'Floor created successfully', 201);
        } catch (\Exception $e) {
            return $this->errorResponse('Failed to create floor: ' . $e->getMessage(), 500);
        }
    }

    /**
     * Update a floor
     * PUT /api/v1/floors/{id}
     */
    public function update(Request $request, $id)
    {
        try {
            $temple = $request->input('current_temple');
            
            $floor = TempleFloor::forTemple($temple['id'])
                ->where('floor_id', $id)
                ->first();

            if (!$floor) {
                return $this->errorResponse('Floor not found', 404);
            }

            $validator = Validator::make($request->all(), [
                'floor_name' => 'sometimes|required|string|max:100',
                'floor_code' => 'nullable|string|max:20',
                'floor_name_chinese' => 'nullable|string|max:100',
                'description' => 'nullable|string',
                'sort_order' => 'nullable|integer',
                'is_active' => 'nullable|boolean'
            ]);

            if ($validator->fails()) {
                return $this->errorResponse($validator->errors()->first(), 422);
            }

            $floor->update([
                'floor_name' => $request->floor_name ?? $floor->floor_name,
                'floor_code' => $request->floor_code ?? $floor->floor_code,
                'floor_name_chinese' => $request->floor_name_chinese ?? $floor->floor_name_chinese,
                'description' => $request->description ?? $floor->description,
                'sort_order' => $request->sort_order ?? $floor->sort_order,
                'is_active' => $request->is_active ?? $floor->is_active,
                'updated_by' => auth()->id()
            ]);

            return $this->successResponse($floor, 'Floor updated successfully');
        } catch (\Exception $e) {
            return $this->errorResponse('Failed to update floor: ' . $e->getMessage(), 500);
        }
    }

    /**
     * Delete a floor
     * DELETE /api/v1/floors/{id}
     */
    public function destroy(Request $request, $id)
    {
        try {
            $temple = $request->input('current_temple');
            
            $floor = TempleFloor::forTemple($temple['id'])
                ->where('floor_id', $id)
                ->first();

            if (!$floor) {
                return $this->errorResponse('Floor not found', 404);
            }

            // Check if floor has deities or configs
            if ($floor->deities()->count() > 0 || $floor->lightConfigs()->count() > 0) {
                return $this->errorResponse('Cannot delete floor with associated deities or light configurations', 400);
            }

            $floor->delete();

            return $this->successResponse(null, 'Floor deleted successfully');
        } catch (\Exception $e) {
            return $this->errorResponse('Failed to delete floor: ' . $e->getMessage(), 500);
        }
    }

    /**
     * Toggle floor status
     * POST /api/v1/floors/{id}/toggle-status
     */
    public function toggleStatus(Request $request, $id)
    {
        try {
            $temple = $request->input('current_temple');
            
            $floor = TempleFloor::forTemple($temple['id'])
                ->where('floor_id', $id)
                ->first();

            if (!$floor) {
                return $this->errorResponse('Floor not found', 404);
            }

            $floor->update([
                'is_active' => !$floor->is_active,
                'updated_by' => auth()->id()
            ]);

            return $this->successResponse($floor, 'Floor status updated successfully');
        } catch (\Exception $e) {
            return $this->errorResponse('Failed to toggle floor status: ' . $e->getMessage(), 500);
        }
    }
}
