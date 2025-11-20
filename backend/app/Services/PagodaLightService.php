<?php

namespace App\Services;

use App\Models\PagodaBlock;
use App\Models\PagodaLightSlot;
use App\Models\PagodaTower;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Str;

class PagodaLightService
{
    /**
     * Generate all light slots for a block
     */
    public function generateLightsForBlock(PagodaBlock $block)
    {
        DB::beginTransaction();
        
        try {
            $tower = $block->tower;
            
            // Get the starting light number (next available)
            $startLightNumber = PagodaLightSlot::max('light_number') ?? 0;
            $startLightNumber += 1;
            
            $currentLightNumber = $startLightNumber;
            $lightsGenerated = 0;
            $lights = [];
            
            // Generate lights for each floor and rag position
            for ($floor = 1; $floor <= $block->total_floors; $floor++) {
                for ($rag = 1; $rag <= $block->rags_per_floor; $rag++) {
                    
                    // Generate light code: A-B1-01-001
                    $lightCode = sprintf(
                        '%s-%s-%02d-%03d',
                        $tower->tower_code,
                        $block->block_code,
                        $floor,
                        $rag
                    );
                    
                    $lights[] = [
                        'id' => Str::uuid()->toString(),
                        'block_id' => $block->id,
                        'light_number' => $currentLightNumber,
                        'light_code' => $lightCode,
                        'floor_number' => $floor,
                        'rag_position' => $rag,
                        'status' => 'available',
                        'created_at' => now(),
                        'updated_at' => now()
                    ];
                    
                    $currentLightNumber++;
                    $lightsGenerated++;
                    
                    // Batch insert every 500 records for performance
                    if (count($lights) >= 500) {
                        PagodaLightSlot::insert($lights);
                        $lights = [];
                    }
                }
            }
            
            // Insert remaining lights
            if (count($lights) > 0) {
                PagodaLightSlot::insert($lights);
            }
            
            DB::commit();
            
            return [
                'success' => true,
                'total_generated' => $lightsGenerated,
                'start_number' => $startLightNumber,
                'end_number' => $currentLightNumber - 1,
                'message' => "Successfully generated {$lightsGenerated} lights"
            ];
            
        } catch (\Exception $e) {
            DB::rollBack();
            
            return [
                'success' => false,
                'message' => 'Failed to generate lights: ' . $e->getMessage()
            ];
        }
    }

    /**
     * Get next available light number
     */
    public function getNextAvailableLightNumber()
    {
        return (PagodaLightSlot::max('light_number') ?? 0) + 1;
    }

    /**
     * Get next available light (for auto-assignment)
     */
    public function getNextAvailableLight($blockId = null)
    {
        $query = PagodaLightSlot::where('status', 'available');
        
        if ($blockId) {
            $query->where('block_id', $blockId);
        }
        
        return $query->orderBy('light_number')->first();
    }

    /**
     * Generate receipt number
     */
    public function generateReceiptNumber()
    {
        $date = now()->format('Ymd');
        $sequence = DB::table('pagoda_light_registrations')
                      ->whereDate('created_at', now()->toDateString())
                      ->count() + 1;
        
        return 'TH' . $date . str_pad($sequence, 4, '0', STR_PAD_LEFT);
    }

    /**
     * Calculate expiry date based on offer date
     */
    public function calculateExpiryDate($offerDate, $months = null)
    {
        if (!$months) {
            $months = PagodaBookingSetting::get('expiry_duration_months', 12);
        }
        
        return \Carbon\Carbon::parse($offerDate)->addMonths($months)->toDateString();
    }

    /**
     * Get light availability statistics
     */
    public function getLightStatistics($towerId = null, $blockId = null)
    {
        $query = PagodaLightSlot::query();
        
        if ($towerId) {
            $query->whereHas('block', function($q) use ($towerId) {
                $q->where('tower_id', $towerId);
            });
        }
        
        if ($blockId) {
            $query->where('block_id', $blockId);
        }
        
        return [
            'total' => $query->count(),
            'available' => (clone $query)->where('status', 'available')->count(),
            'registered' => (clone $query)->where('status', 'registered')->count(),
            'expired' => (clone $query)->where('status', 'expired')->count(),
            'terminated' => (clone $query)->where('status', 'terminated')->count(),
            'maintenance' => (clone $query)->where('status', 'maintenance')->count(),
        ];
    }

    /**
     * Check if light is available
     */
    public function isLightAvailable($lightNumber)
    {
        $light = PagodaLightSlot::where('light_number', $lightNumber)->first();
        return $light && $light->status === 'available';
    }

    /**
     * Search lights with filters
     */
    public function searchLights($filters = [])
    {
        $query = PagodaLightSlot::with(['block.tower', 'currentRegistration.devotee']);
        
        // Filter by tower
        if (!empty($filters['tower_id'])) {
            $query->whereHas('block', function($q) use ($filters) {
                $q->where('tower_id', $filters['tower_id']);
            });
        }
        
        // Filter by block
        if (!empty($filters['block_id'])) {
            $query->where('block_id', $filters['block_id']);
        }
        
        // Filter by floor
        if (!empty($filters['floor_number'])) {
            $query->where('floor_number', $filters['floor_number']);
        }
        
        // Filter by status
        if (!empty($filters['status'])) {
            if (is_array($filters['status'])) {
                $query->whereIn('status', $filters['status']);
            } else {
                $query->where('status', $filters['status']);
            }
        }
        
        // Filter by light number range
        if (!empty($filters['light_number_from'])) {
            $query->where('light_number', '>=', $filters['light_number_from']);
        }
        if (!empty($filters['light_number_to'])) {
            $query->where('light_number', '<=', $filters['light_number_to']);
        }
        
        // Search by light code
        if (!empty($filters['search'])) {
            $search = $filters['search'];
            $query->where(function($q) use ($search) {
                $q->where('light_number', 'ILIKE', "%{$search}%")
                  ->orWhere('light_code', 'ILIKE', "%{$search}%");
            });
        }
        
        // Sorting
        $sortBy = $filters['sort_by'] ?? 'light_number';
        $sortOrder = $filters['sort_order'] ?? 'asc';
        $query->orderBy($sortBy, $sortOrder);
        
        return $query;
    }
}