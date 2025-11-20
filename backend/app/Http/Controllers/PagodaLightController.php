<?php

namespace App\Http\Controllers;

use App\Models\PagodaLightSlot;
use App\Services\PagodaLightService;
use App\Traits\ApiResponse;
use Illuminate\Http\Request;

class PagodaLightController extends Controller
{
    use ApiResponse;

    protected $lightService;

    public function __construct(PagodaLightService $lightService)
    {
        $this->lightService = $lightService;
    }

    /**
     * Search lights with filters
     */
    public function index(Request $request)
    {
        try {
            $perPage = $request->get('per_page', 50);
            
            $query = $this->lightService->searchLights($request->all());
            
            $lights = $query->paginate($perPage);
            
            // Transform data
            $lights->getCollection()->transform(function($light) {
                return [
                    'id' => $light->id,
                    'light_number' => $light->light_number,
                    'light_code' => $light->light_code,
                    'block' => [
                        'id' => $light->block->id,
                        'name' => $light->block->block_name,
                        'code' => $light->block->block_code
                    ],
                    'tower' => [
                        'id' => $light->block->tower->id,
                        'name' => $light->block->tower->tower_name,
                        'code' => $light->block->tower->tower_code
                    ],
                    'floor_number' => $light->floor_number,
                    'rag_position' => $light->rag_position,
                    'status' => $light->status,
                    'devotee' => $light->currentRegistration ? [
                        'name' => $light->currentRegistration->devotee->name_english,
                        'contact' => $light->currentRegistration->devotee->contact_no
                    ] : null,
                    'expiry_date' => $light->currentRegistration 
                        ? $light->currentRegistration->expiry_date 
                        : null
                ];
            });
            
            return $this->successResponse($lights, 'Lights retrieved successfully');
            
        } catch (\Exception $e) {
            return $this->errorResponse('Failed to retrieve lights: ' . $e->getMessage(), 500);
        }
    }

    /**
     * Get single light details
     */
    public function show($id)
    {
        try {
            $light = PagodaLightSlot::with([
                'block.tower',
                'currentRegistration.devotee',
                'registrations' => function($q) {
                    $q->orderBy('created_at', 'desc')->limit(5);
                }
            ])->findOrFail($id);
            
            $data = [
                'light' => [
                    'id' => $light->id,
                    'light_number' => $light->light_number,
                    'light_code' => $light->light_code,
                    'floor_number' => $light->floor_number,
                    'rag_position' => $light->rag_position,
                    'status' => $light->status
                ],
                'location' => [
                    'tower' => $light->block->tower->tower_name,
                    'tower_code' => $light->block->tower->tower_code,
                    'block' => $light->block->block_name,
                    'block_code' => $light->block->block_code,
                    'floor' => $light->floor_number,
                    'position' => $light->rag_position
                ],
                'current_registration' => $light->currentRegistration ? [
                    'id' => $light->currentRegistration->id,
                    'devotee' => [
                        'name_english' => $light->currentRegistration->devotee->name_english,
                        'name_chinese' => $light->currentRegistration->devotee->name_chinese,
                        'contact_no' => $light->currentRegistration->devotee->contact_no
                    ],
                    'light_option' => $light->currentRegistration->light_option,
                    'merit_amount' => $light->currentRegistration->merit_amount,
                    'offer_date' => $light->currentRegistration->offer_date,
                    'expiry_date' => $light->currentRegistration->expiry_date,
                    'days_until_expiry' => $light->currentRegistration->daysUntilExpiry(),
                    'receipt_number' => $light->currentRegistration->receipt_number
                ] : null,
                'registration_history' => $light->registrations->map(function($reg) {
                    return [
                        'id' => $reg->id,
                        'devotee_name' => $reg->devotee->name_english,
                        'offer_date' => $reg->offer_date,
                        'expiry_date' => $reg->expiry_date,
                        'status' => $reg->status,
                        'receipt_number' => $reg->receipt_number
                    ];
                })
            ];
            
            return $this->successResponse($data, 'Light details retrieved successfully');
            
        } catch (\Exception $e) {
            return $this->notFoundResponse('Light not found');
        }
    }

    /**
     * Get next available light (for auto-assignment)
     */
    public function getNextAvailable(Request $request)
    {
        try {
            $blockId = $request->get('block_id');
            
            $light = $this->lightService->getNextAvailableLight($blockId);
            
            if (!$light) {
                return $this->errorResponse('No available lights found', 404);
            }
            
            $data = [
                'light_number' => $light->light_number,
                'light_code' => $light->light_code,
                'block' => [
                    'id' => $light->block->id,
                    'name' => $light->block->block_name,
                    'code' => $light->block->block_code
                ],
                'tower' => [
                    'id' => $light->block->tower->id,
                    'name' => $light->block->tower->tower_name,
                    'code' => $light->block->tower->tower_code
                ],
                'floor_number' => $light->floor_number,
                'rag_position' => $light->rag_position
            ];
            
            return $this->successResponse($data, 'Next available light retrieved successfully');
            
        } catch (\Exception $e) {
            return $this->errorResponse('Failed to get available light: ' . $e->getMessage(), 500);
        }
    }

    /**
     * Check light availability
     */
    public function checkAvailability($lightNumber)
    {
        try {
            $isAvailable = $this->lightService->isLightAvailable($lightNumber);
            
            $light = PagodaLightSlot::where('light_number', $lightNumber)
                                   ->with('block.tower')
                                   ->first();
            
            if (!$light) {
                return $this->notFoundResponse('Light not found');
            }
            
            $data = [
                'light_number' => $light->light_number,
                'light_code' => $light->light_code,
                'is_available' => $isAvailable,
                'status' => $light->status,
                'location' => [
                    'tower' => $light->block->tower->tower_name,
                    'block' => $light->block->block_name,
                    'floor' => $light->floor_number,
                    'position' => $light->rag_position
                ]
            ];
            
            return $this->successResponse($data, 'Light availability checked');
            
        } catch (\Exception $e) {
            return $this->errorResponse('Failed to check availability: ' . $e->getMessage(), 500);
        }
    }

    /**
     * Get light statistics
     */
    public function statistics(Request $request)
    {
        try {
            $towerId = $request->get('tower_id');
            $blockId = $request->get('block_id');
            
            $stats = $this->lightService->getLightStatistics($towerId, $blockId);
            
            return $this->successResponse($stats, 'Statistics retrieved successfully');
            
        } catch (\Exception $e) {
            return $this->errorResponse('Failed to get statistics: ' . $e->getMessage(), 500);
        }
    }
}