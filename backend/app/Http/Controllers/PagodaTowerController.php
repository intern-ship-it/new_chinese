<?php

namespace App\Http\Controllers;

use App\Models\PagodaTower;
use App\Services\PagodaLightService;
use App\Traits\ApiResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Validator;

class PagodaTowerController extends Controller
{
    use ApiResponse;

    protected $lightService;

    public function __construct(PagodaLightService $lightService)
    {
        $this->lightService = $lightService;
    }

    /**
     * Get all towers with statistics
     */
    public function index(Request $request)
    {
        try {
            $query = PagodaTower::with(['blocks', 'creator', 'updater']);
            
            // Filter by status
            if ($request->has('status')) {
                $query->where('status', $request->status);
            }
            
            // Search
            if ($request->has('search')) {
                $search = $request->search;
                $query->where(function($q) use ($search) {
                    $q->where('tower_name', 'ILIKE', "%{$search}%")
                      ->orWhere('tower_code', 'ILIKE', "%{$search}%");
                });
            }
            
            $towers = $query->get()->map(function($tower) {
                return [
                    'id' => $tower->id,
                    'tower_name' => $tower->tower_name,
                    'tower_code' => $tower->tower_code,
                    'description' => $tower->description,
                    'location' => $tower->location,
                    'status' => $tower->status,
                    'total_blocks' => $tower->blocks()->count(),
                    'total_capacity' => $tower->total_capacity,
                    'available_lights' => $tower->available_lights,
                    'booked_lights' => $tower->booked_lights,
                    'occupancy_rate' => $tower->total_capacity > 0 
                        ? round(($tower->booked_lights / $tower->total_capacity) * 100, 2) 
                        : 0,
                    'created_by' => $tower->creator ? $tower->creator->name : null,
                    'created_at' => $tower->created_at,
                    'updated_at' => $tower->updated_at
                ];
            });
            
            return $this->successResponse($towers, 'Towers retrieved successfully');
            
        } catch (\Exception $e) {
            return $this->errorResponse('Failed to retrieve towers: ' . $e->getMessage(), 500);
        }
    }

    /**
     * Get single tower with detailed statistics
     */
    public function show($id)
    {
        try {
            $tower = PagodaTower::with(['blocks.lightSlots'])->findOrFail($id);
            
            // Get statistics
            $stats = $this->lightService->getLightStatistics($tower->id);
            
            $data = [
                'tower' => [
                    'id' => $tower->id,
                    'tower_name' => $tower->tower_name,
                    'tower_code' => $tower->tower_code,
                    'description' => $tower->description,
                    'location' => $tower->location,
                    'status' => $tower->status,
                    'created_at' => $tower->created_at,
                    'updated_at' => $tower->updated_at
                ],
                'statistics' => $stats,
                'blocks' => $tower->blocks->map(function($block) {
                    return [
                        'id' => $block->id,
                        'block_name' => $block->block_name,
                        'block_code' => $block->block_code,
                        'total_floors' => $block->total_floors,
                        'rags_per_floor' => $block->rags_per_floor,
                        'total_capacity' => $block->total_capacity,
                        'available_lights' => $block->available_lights_count,
                        'booked_lights' => $block->booked_lights_count,
                        'display_order' => $block->display_order,
                        'status' => $block->status
                    ];
                })
            ];
            
            return $this->successResponse($data, 'Tower details retrieved successfully');
            
        } catch (\Exception $e) {
            return $this->notFoundResponse('Tower not found');
        }
    }

    /**
     * Create new tower
     */
    public function store(Request $request)
    {
        $validator = Validator::make($request->all(), [
            'tower_name' => 'required|string|max:100',
            'tower_code' => 'required|string|max:10|unique:pagoda_towers,tower_code',
            'description' => 'nullable|string',
            'location' => 'nullable|string|max:255',
            'status' => 'in:active,inactive,maintenance'
        ]);

        if ($validator->fails()) {
            return $this->validationErrorResponse($validator->errors());
        }

        try {
            $tower = PagodaTower::create([
                'tower_name' => $request->tower_name,
                'tower_code' => strtoupper($request->tower_code),
                'description' => $request->description,
                'location' => $request->location,
                'status' => $request->status ?? 'active',
                'created_by' => auth()->id()
            ]);

            return $this->successResponse(
                $tower->load('creator'), 
                'Tower created successfully', 
                201
            );

        } catch (\Exception $e) {
            return $this->errorResponse('Failed to create tower: ' . $e->getMessage(), 500);
        }
    }

    /**
     * Update tower
     */
    public function update(Request $request, $id)
    {
        $validator = Validator::make($request->all(), [
            'tower_name' => 'required|string|max:100',
            'tower_code' => 'required|string|max:10|unique:pagoda_towers,tower_code,' . $id,
            'description' => 'nullable|string',
            'location' => 'nullable|string|max:255',
            'status' => 'in:active,inactive,maintenance'
        ]);

        if ($validator->fails()) {
            return $this->validationErrorResponse($validator->errors());
        }

        try {
            $tower = PagodaTower::findOrFail($id);
            
            $tower->update([
                'tower_name' => $request->tower_name,
                'tower_code' => strtoupper($request->tower_code),
                'description' => $request->description,
                'location' => $request->location,
                'status' => $request->status,
                'updated_by' => auth()->id()
            ]);

            return $this->successResponse(
                $tower->fresh(['creator', 'updater']), 
                'Tower updated successfully'
            );

        } catch (\Exception $e) {
            return $this->notFoundResponse('Tower not found');
        }
    }

    /**
     * Delete tower (soft delete - change status)
     */
    public function destroy($id)
    {
        try {
            $tower = PagodaTower::findOrFail($id);
            
            // Check if tower has blocks with lights
            $hasLights = $tower->blocks()->whereHas('lightSlots')->exists();
            
            if ($hasLights) {
                return $this->errorResponse(
                    'Cannot delete tower with existing light slots. Please delete all blocks first.', 
                    400
                );
            }
            
            // Delete tower and its blocks
            $tower->blocks()->delete();
            $tower->delete();

            return $this->successResponse(null, 'Tower deleted successfully');

        } catch (\Exception $e) {
            return $this->errorResponse('Failed to delete tower: ' . $e->getMessage(), 500);
        }
    }

    /**
     * Get tower statistics dashboard
     */
    public function statistics($id)
    {
        try {
            $tower = PagodaTower::findOrFail($id);
            $stats = $this->lightService->getLightStatistics($tower->id);
            
            // Additional statistics
            $blockStats = $tower->blocks->map(function($block) use ($tower) {
                $blockStats = $this->lightService->getLightStatistics($tower->id, $block->id);
                return [
                    'block_name' => $block->block_name,
                    'block_code' => $block->block_code,
                    'total' => $blockStats['total'],
                    'available' => $blockStats['available'],
                    'registered' => $blockStats['registered'],
                    'occupancy_rate' => $blockStats['total'] > 0 
                        ? round(($blockStats['registered'] / $blockStats['total']) * 100, 2) 
                        : 0
                ];
            });
            
            $data = [
                'tower_name' => $tower->tower_name,
                'overall_statistics' => $stats,
                'occupancy_rate' => $stats['total'] > 0 
                    ? round(($stats['registered'] / $stats['total']) * 100, 2) 
                    : 0,
                'block_statistics' => $blockStats
            ];
            
            return $this->successResponse($data, 'Tower statistics retrieved successfully');
            
        } catch (\Exception $e) {
            return $this->notFoundResponse('Tower not found');
        }
    }
}