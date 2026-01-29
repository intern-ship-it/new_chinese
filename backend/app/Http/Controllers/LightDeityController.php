<?php

namespace App\Http\Controllers;

use App\Models\LightDeity;
use App\Traits\ApiResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Validator;

class LightDeityController extends Controller
{
    use ApiResponse;

    /**
     * Get all deities for a temple
     * GET /api/v1/light-deities
     */
    public function index(Request $request)
    {
        try {
            $temple = $request->input('current_temple');
            
            $query = LightDeity::forTemple($temple['id'])
                ->active()
                ->with('floor');

            // Filter by floor if provided
            if ($request->has('floor_id')) {
                $query->forFloor($request->floor_id);
            }

            $deities = $query->ordered()->get();

            return $this->successResponse($deities, 'Deities retrieved successfully');
        } catch (\Exception $e) {
            return $this->errorResponse('Failed to retrieve deities: ' . $e->getMessage(), 500);
        }
    }

    /**
     * Get all deities including inactive
     * GET /api/v1/light-deities/all
     */
    public function all(Request $request)
    {
        try {
            $temple = $request->input('current_temple');
            
            $deities = LightDeity::forTemple($temple['id'])
                ->with('floor')
                ->ordered()
                ->get();

            return $this->successResponse($deities, 'All deities retrieved successfully');
        } catch (\Exception $e) {
            return $this->errorResponse('Failed to retrieve deities: ' . $e->getMessage(), 500);
        }
    }

    /**
     * Get a single deity
     * GET /api/v1/light-deities/{id}
     */
    public function show(Request $request, $id)
    {
        try {
            $temple = $request->input('current_temple');
            
            $deity = LightDeity::forTemple($temple['id'])
                ->where('deity_id', $id)
                ->with(['floor', 'lightConfigs'])
                ->first();

            if (!$deity) {
                return $this->errorResponse('Deity not found', 404);
            }

            return $this->successResponse($deity, 'Deity retrieved successfully');
        } catch (\Exception $e) {
            return $this->errorResponse('Failed to retrieve deity: ' . $e->getMessage(), 500);
        }
    }

    /**
     * Create a new deity
     * POST /api/v1/light-deities
     */
    public function store(Request $request)
    {
        try {
            $temple = $request->input('current_temple');
            
            $validator = Validator::make($request->all(), [
                'deity_name' => 'required|string|max:100',
                'deity_name_chinese' => 'nullable|string|max:100',
                'deity_name_tamil' => 'nullable|string|max:100',
                'floor_id' => 'required|exists:temple_floor,floor_id',
                'description' => 'nullable|string',
                'image_url' => 'nullable|url',
                'sort_order' => 'nullable|integer',
                'is_active' => 'nullable|boolean'
            ]);

            if ($validator->fails()) {
                return $this->errorResponse($validator->errors()->first(), 422);
            }

            $deity = LightDeity::create([
                'temple_id' => $temple['id'],
                'deity_name' => $request->deity_name,
                'deity_name_chinese' => $request->deity_name_chinese,
                'deity_name_tamil' => $request->deity_name_tamil,
                'floor_id' => $request->floor_id,
                'description' => $request->description,
                'image_url' => $request->image_url,
                'sort_order' => $request->sort_order ?? 0,
                'is_active' => $request->is_active ?? true,
                'created_by' => auth()->id()
            ]);

            $deity->load('floor');

            return $this->successResponse($deity, 'Deity created successfully', 201);
        } catch (\Exception $e) {
            return $this->errorResponse('Failed to create deity: ' . $e->getMessage(), 500);
        }
    }

    /**
     * Update a deity
     * PUT /api/v1/light-deities/{id}
     */
    public function update(Request $request, $id)
    {
        try {
            $temple = $request->input('current_temple');
            
            $deity = LightDeity::forTemple($temple['id'])
                ->where('deity_id', $id)
                ->first();

            if (!$deity) {
                return $this->errorResponse('Deity not found', 404);
            }

            $validator = Validator::make($request->all(), [
                'deity_name' => 'sometimes|required|string|max:100',
                'deity_name_chinese' => 'nullable|string|max:100',
                'deity_name_tamil' => 'nullable|string|max:100',
                'floor_id' => 'sometimes|required|exists:temple_floor,floor_id',
                'description' => 'nullable|string',
                'image_url' => 'nullable|url',
                'sort_order' => 'nullable|integer',
                'is_active' => 'nullable|boolean'
            ]);

            if ($validator->fails()) {
                return $this->errorResponse($validator->errors()->first(), 422);
            }

            $deity->update(array_filter([
                'deity_name' => $request->deity_name,
                'deity_name_chinese' => $request->deity_name_chinese,
                'deity_name_tamil' => $request->deity_name_tamil,
                'floor_id' => $request->floor_id,
                'description' => $request->description,
                'image_url' => $request->image_url,
                'sort_order' => $request->sort_order,
                'is_active' => $request->is_active,
                'updated_by' => auth()->id()
            ], function ($value) {
                return $value !== null;
            }));

            $deity->load('floor');

            return $this->successResponse($deity, 'Deity updated successfully');
        } catch (\Exception $e) {
            return $this->errorResponse('Failed to update deity: ' . $e->getMessage(), 500);
        }
    }

    /**
     * Delete a deity
     * DELETE /api/v1/light-deities/{id}
     */
    public function destroy(Request $request, $id)
    {
        try {
            $temple = $request->input('current_temple');
            
            $deity = LightDeity::forTemple($temple['id'])
                ->where('deity_id', $id)
                ->first();

            if (!$deity) {
                return $this->errorResponse('Deity not found', 404);
            }

            // Check if deity has light configurations
            if ($deity->lightConfigs()->count() > 0) {
                return $this->errorResponse('Cannot delete deity with associated light configurations', 400);
            }

            $deity->delete();

            return $this->successResponse(null, 'Deity deleted successfully');
        } catch (\Exception $e) {
            return $this->errorResponse('Failed to delete deity: ' . $e->getMessage(), 500);
        }
    }

    /**
     * Toggle deity status
     * POST /api/v1/light-deities/{id}/toggle-status
     */
    public function toggleStatus(Request $request, $id)
    {
        try {
            $temple = $request->input('current_temple');
            
            $deity = LightDeity::forTemple($temple['id'])
                ->where('deity_id', $id)
                ->first();

            if (!$deity) {
                return $this->errorResponse('Deity not found', 404);
            }

            $deity->update([
                'is_active' => !$deity->is_active,
                'updated_by' => auth()->id()
            ]);

            return $this->successResponse($deity, 'Deity status updated successfully');
        } catch (\Exception $e) {
            return $this->errorResponse('Failed to toggle deity status: ' . $e->getMessage(), 500);
        }
    }
}
