<?php

namespace App\Http\Controllers;

use App\Models\PagodaBlock;
use App\Models\PagodaTower;
use App\Services\PagodaLightService;
use App\Traits\ApiResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Validator;

class PagodaBlockController extends Controller
{
    use ApiResponse;

    protected $lightService;

    public function __construct(PagodaLightService $lightService)
    {
        $this->lightService = $lightService;
    }

    /**
     * Get all blocks for a tower
     */
    public function index(Request $request, $towerId = null)
    {
        try {
            $query = PagodaBlock::with(['tower', 'creator'])
                                ->ordered();
            
            if ($towerId) {
                $query->where('tower_id', $towerId);
            }
            
            // Filter by status
            if ($request->has('status')) {
                $query->where('status', $request->status);
            }
            
            $blocks = $query->get()->map(function($block) {
                // Get light range
                $firstLight = $block->lightSlots()->min('light_number');
                $lastLight = $block->lightSlots()->max('light_number');
                
                return [
                    'id' => $block->id,
                    'tower_id' => $block->tower_id,
                    'tower_name' => $block->tower->tower_name,
                    'tower_code' => $block->tower->tower_code,
                    'block_name' => $block->block_name,
                    'block_code' => $block->block_code,
                    'total_floors' => $block->total_floors,
                    'rags_per_floor' => $block->rags_per_floor,
                    'total_capacity' => $block->total_capacity,
                    'lights_generated' => $block->lightSlots()->count(),
                    'available_lights' => $block->available_lights_count,
                    'booked_lights' => $block->booked_lights_count,
                    'light_range' => $firstLight && $lastLight 
                        ? "{$firstLight} - {$lastLight}" 
                        : 'Not generated',
                    'display_order' => $block->display_order,
                    'status' => $block->status,
                    'created_at' => $block->created_at
                ];
            });
            
            return $this->successResponse($blocks, 'Blocks retrieved successfully');
            
        } catch (\Exception $e) {
            return $this->errorResponse('Failed to retrieve blocks: ' . $e->getMessage(), 500);
        }
    }

    /**
     * Get single block details
     */
    public function show($id)
    {
        try {
            $block = PagodaBlock::with(['tower', 'creator', 'updater'])->findOrFail($id);
            
            // Get light range
            $firstLight = $block->lightSlots()->min('light_number');
            $lastLight = $block->lightSlots()->max('light_number');
            
            $data = [
                'id' => $block->id,
                'tower' => [
                    'id' => $block->tower->id,
                    'name' => $block->tower->tower_name,
                    'code' => $block->tower->tower_code
                ],
                'block_name' => $block->block_name,
                'block_code' => $block->block_code,
                'total_floors' => $block->total_floors,
                'rags_per_floor' => $block->rags_per_floor,
                'total_capacity' => $block->total_capacity,
                'description' => $block->description,
                'physical_location' => $block->physical_location,
                'display_order' => $block->display_order,
                'status' => $block->status,
                'lights_generated' => $block->lightSlots()->count(),
                'available_lights' => $block->available_lights_count,
                'booked_lights' => $block->booked_lights_count,
                'light_range' => $firstLight && $lastLight 
                    ? ['from' => $firstLight, 'to' => $lastLight] 
                    : null,
                'created_by' => $block->creator ? $block->creator->name : null,
                'created_at' => $block->created_at,
                'updated_at' => $block->updated_at
            ];
            
            return $this->successResponse($data, 'Block details retrieved successfully');
            
        } catch (\Exception $e) {
            return $this->notFoundResponse('Block not found');
        }
    }

    /**
     * Create new block
     */
    public function store(Request $request)
    {
        $validator = Validator::make($request->all(), [
            'tower_id' => 'required|uuid|exists:pagoda_towers,id',
            'block_name' => 'required|string|max:100',
            'block_code' => 'required|string|max:10',
            'total_floors' => 'required|integer|min:1|max:200',
            'rags_per_floor' => 'required|integer|min:1|max:500',
            'display_order' => 'nullable|integer|min:1',
            'description' => 'nullable|string',
            'physical_location' => 'nullable|string|max:255',
            'status' => 'in:active,inactive,maintenance',
            'auto_generate_lights' => 'boolean'
        ]);

        if ($validator->fails()) {
            return $this->validationErrorResponse($validator->errors());
        }

        try {
            // Check if block code is unique within tower
            $exists = PagodaBlock::where('tower_id', $request->tower_id)
                                 ->where('block_code', $request->block_code)
                                 ->exists();
            
            if ($exists) {
                return $this->errorResponse('Block code already exists for this tower', 400);
            }
            
            // Create block
            $block = PagodaBlock::create([
                'tower_id' => $request->tower_id,
                'block_name' => $request->block_name,
                'block_code' => strtoupper($request->block_code),
                'total_floors' => $request->total_floors,
                'rags_per_floor' => $request->rags_per_floor,
                'display_order' => $request->display_order ?? 1,
                'description' => $request->description,
                'physical_location' => $request->physical_location,
                'status' => $request->status ?? 'active',
                'created_by' => auth()->id()
            ]);
            
            // Auto-generate lights if requested
            if ($request->get('auto_generate_lights', true)) {
                $result = $this->lightService->generateLightsForBlock($block);
                
                if (!$result['success']) {
                    $block->delete();
                    return $this->errorResponse($result['message'], 500);
                }
                
                $block->generation_info = $result;
            }
            
            return $this->successResponse(
                $block->load(['tower', 'creator']), 
                'Block created successfully', 
                201
            );

        } catch (\Exception $e) {
            return $this->errorResponse('Failed to create block: ' . $e->getMessage(), 500);
        }
    }

    /**
     * Update block
     */
    public function update(Request $request, $id)
    {
        $validator = Validator::make($request->all(), [
            'block_name' => 'required|string|max:100',
            'display_order' => 'nullable|integer|min:1',
            'description' => 'nullable|string',
            'physical_location' => 'nullable|string|max:255',
            'status' => 'in:active,inactive,maintenance'
        ]);

        if ($validator->fails()) {
            return $this->validationErrorResponse($validator->errors());
        }

        try {
            $block = PagodaBlock::findOrFail($id);
            
            // Cannot change structure if lights are generated
            $hasLights = $block->lightSlots()->exists();
            
            if ($hasLights) {
                // Only allow certain fields to be updated
                $block->update([
                    'block_name' => $request->block_name,
                    'display_order' => $request->display_order,
                    'description' => $request->description,
                    'physical_location' => $request->physical_location,
                    'status' => $request->status,
                    'updated_by' => auth()->id()
                ]);
            } else {
                return $this->errorResponse(
                    'Cannot modify block structure after lights are generated', 
                    400
                );
            }

            return $this->successResponse(
                $block->fresh(['tower', 'creator', 'updater']), 
                'Block updated successfully'
            );

        } catch (\Exception $e) {
            return $this->notFoundResponse('Block not found');
        }
    }

    /**
     * Delete block
     */
    public function destroy($id)
    {
        try {
            $block = PagodaBlock::findOrFail($id);
            
            // Check if block has registered lights
            $hasRegisteredLights = $block->lightSlots()
                                        ->where('status', 'registered')
                                        ->exists();
            
            if ($hasRegisteredLights) {
                return $this->errorResponse(
                    'Cannot delete block with registered lights', 
                    400
                );
            }
            
            // Delete all light slots and the block
            $block->lightSlots()->delete();
            $block->delete();

            return $this->successResponse(null, 'Block deleted successfully');

        } catch (\Exception $e) {
            return $this->errorResponse('Failed to delete block: ' . $e->getMessage(), 500);
        }
    }

    /**
     * Generate lights for a block
     */
    public function generateLights($id)
    {
        try {
            $block = PagodaBlock::findOrFail($id);
            
            // Check if lights already generated
            if ($block->lightSlots()->exists()) {
                return $this->errorResponse('Lights already generated for this block', 400);
            }
            
            $result = $this->lightService->generateLightsForBlock($block);
            
            if ($result['success']) {
                return $this->successResponse($result, $result['message']);
            } else {
                return $this->errorResponse($result['message'], 500);
            }

        } catch (\Exception $e) {
            return $this->notFoundResponse('Block not found');
        }
    }

    /**
     * Get block light map (floor by floor visualization data)
     */
    public function getLightMap($id, Request $request)
    {
        try {
            $block = PagodaBlock::with('tower')->findOrFail($id);
            
            $floor = $request->get('floor', 1);
            
            if ($floor < 1 || $floor > $block->total_floors) {
                return $this->errorResponse('Invalid floor number', 400);
            }
            
            // Get all lights for this floor
            $lights = $block->lightSlots()
                           ->where('floor_number', $floor)
                           ->with('currentRegistration.devotee')
                           ->orderBy('rag_position')
                           ->get()
                           ->map(function($light) {
                               return [
                                   'light_number' => $light->light_number,
                                   'light_code' => $light->light_code,
                                   'rag_position' => $light->rag_position,
                                   'status' => $light->status,
                                   'devotee_name' => $light->currentRegistration 
                                       ? $light->currentRegistration->devotee->name_english 
                                       : null,
                                   'expiry_date' => $light->currentRegistration 
                                       ? $light->currentRegistration->expiry_date 
                                       : null
                               ];
                           });
            
            $data = [
                'block_name' => $block->block_name,
                'block_code' => $block->block_code,
                'tower_code' => $block->tower->tower_code,
                'current_floor' => $floor,
                'total_floors' => $block->total_floors,
                'rags_per_floor' => $block->rags_per_floor,
                'lights' => $lights
            ];
            
            return $this->successResponse($data, 'Light map retrieved successfully');
            
        } catch (\Exception $e) {
            return $this->notFoundResponse('Block not found');
        }
    }
}