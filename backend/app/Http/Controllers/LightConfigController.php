<?php

namespace App\Http\Controllers;

use App\Models\LightLayoutConfig;
use App\Models\LightLayoutRow;
use App\Models\LightUnit;
use App\Traits\ApiResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Validator;
use Illuminate\Support\Facades\DB;

class LightConfigController extends Controller
{
    use ApiResponse;

    /**
     * Get all light configurations
     * GET /api/v1/light-configs
     */
    public function index(Request $request)
    {
        try {
            $temple = $request->input('current_temple');
            
            $query = LightLayoutConfig::forTemple($temple['id'])
                ->active()
                ->with(['floor', 'deity']);

            // Filter by floor
            if ($request->has('floor_id')) {
                $query->forFloor($request->floor_id);
            }

            // Filter by deity
            if ($request->has('deity_id')) {
                $query->forDeity($request->deity_id);
            }

            // Filter by type
            if ($request->has('type')) {
                $query->ofType($request->type);
            }

            $configs = $query->get();

            // Add unit counts
            $configs->each(function ($config) {
                $config->total_units = $config->units()->count();
                $config->available_units = $config->units()->where('status', 'AVAILABLE')->count();
                $config->booked_units = $config->units()->where('status', 'BOOKED')->count();
                $config->reserved_units = $config->units()->where('status', 'RESERVED')->count();
            });

            return $this->successResponse($configs, 'Configurations retrieved successfully');
        } catch (\Exception $e) {
            return $this->errorResponse('Failed to retrieve configurations: ' . $e->getMessage(), 500);
        }
    }

    /**
     * Get a single configuration with rows and units
     * GET /api/v1/light-configs/{id}
     */
    public function show(Request $request, $id)
    {
        try {
            $temple = $request->input('current_temple');
            
            $config = LightLayoutConfig::forTemple($temple['id'])
                ->where('config_id', $id)
                ->with(['floor', 'deity', 'rows'])
                ->first();

            if (!$config) {
                return $this->errorResponse('Configuration not found', 404);
            }

            // Add unit counts
            $config->total_units = $config->units()->count();
            $config->available_units = $config->units()->where('status', 'AVAILABLE')->count();

            return $this->successResponse($config, 'Configuration retrieved successfully');
        } catch (\Exception $e) {
            return $this->errorResponse('Failed to retrieve configuration: ' . $e->getMessage(), 500);
        }
    }

    /**
     * Create a new configuration
     * POST /api/v1/light-configs
     */
    public function store(Request $request)
    {
        try {
            $temple = $request->input('current_temple');
            
            $validator = Validator::make($request->all(), [
                'type' => 'required|in:PAGODA_TOWER,LOTUS_LAMP,WALL_LIGHT',
                'config_name' => 'required|string|max:200',
                'config_code' => 'nullable|string|max:50',
                'floor_id' => 'required|exists:temple_floor,floor_id',
                'deity_id' => 'required|exists:deity,deity_id',
                'description' => 'nullable|string',
                'image_url' => 'nullable|url',
                'is_active' => 'nullable|boolean'
            ]);

            if ($validator->fails()) {
                return $this->errorResponse($validator->errors()->first(), 422);
            }

            // Check if config_code is unique
            if ($request->config_code) {
                $exists = LightLayoutConfig::forTemple($temple['id'])
                    ->where('config_code', $request->config_code)
                    ->exists();
                    
                if ($exists) {
                    return $this->errorResponse('Configuration code already exists', 422);
                }
            }

            $config = LightLayoutConfig::create([
                'temple_id' => $temple['id'],
                'type' => $request->type,
                'config_name' => $request->config_name,
                'config_code' => $request->config_code,
                'floor_id' => $request->floor_id,
                'deity_id' => $request->deity_id,
                'description' => $request->description,
                'image_url' => $request->image_url,
                'is_active' => $request->is_active ?? true,
                'created_by' => auth()->id()
            ]);

            $config->load(['floor', 'deity']);

            return $this->successResponse($config, 'Configuration created successfully', 201);
        } catch (\Exception $e) {
            return $this->errorResponse('Failed to create configuration: ' . $e->getMessage(), 500);
        }
    }

    /**
     * Update a configuration
     * PUT /api/v1/light-configs/{id}
     */
    public function update(Request $request, $id)
    {
        try {
            $temple = $request->input('current_temple');
            
            $config = LightLayoutConfig::forTemple($temple['id'])
                ->where('config_id', $id)
                ->first();

            if (!$config) {
                return $this->errorResponse('Configuration not found', 404);
            }

            $validator = Validator::make($request->all(), [
                'type' => 'sometimes|required|in:PAGODA_TOWER,LOTUS_LAMP,WALL_LIGHT',
                'config_name' => 'sometimes|required|string|max:200',
                'config_code' => 'nullable|string|max:50',
                'floor_id' => 'sometimes|required|exists:temple_floor,floor_id',
                'deity_id' => 'sometimes|required|exists:deity,deity_id',
                'description' => 'nullable|string',
                'image_url' => 'nullable|url',
                'is_active' => 'nullable|boolean'
            ]);

            if ($validator->fails()) {
                return $this->errorResponse($validator->errors()->first(), 422);
            }

            $config->update(array_filter([
                'type' => $request->type,
                'config_name' => $request->config_name,
                'config_code' => $request->config_code,
                'floor_id' => $request->floor_id,
                'deity_id' => $request->deity_id,
                'description' => $request->description,
                'image_url' => $request->image_url,
                'is_active' => $request->is_active,
                'updated_by' => auth()->id()
            ], function ($value) {
                return $value !== null;
            }));

            $config->load(['floor', 'deity']);

            return $this->successResponse($config, 'Configuration updated successfully');
        } catch (\Exception $e) {
            return $this->errorResponse('Failed to update configuration: ' . $e->getMessage(), 500);
        }
    }

    /**
     * Get rows for a configuration
     * GET /api/v1/light-configs/{id}/rows
     */
    public function getRows(Request $request, $id)
    {
        try {
            $temple = $request->input('current_temple');
            
            $config = LightLayoutConfig::forTemple($temple['id'])
                ->where('config_id', $id)
                ->first();

            if (!$config) {
                return $this->errorResponse('Configuration not found', 404);
            }

            $rows = LightLayoutRow::where('config_id', $id)
                ->ordered()
                ->get();

            return $this->successResponse($rows, 'Rows retrieved successfully');
        } catch (\Exception $e) {
            return $this->errorResponse('Failed to retrieve rows: ' . $e->getMessage(), 500);
        }
    }

    /**
     * Save rows for a configuration
     * POST /api/v1/light-configs/{id}/rows
     */
    public function saveRows(Request $request, $id)
    {
        try {
            $temple = $request->input('current_temple');
            
            $config = LightLayoutConfig::forTemple($temple['id'])
                ->where('config_id', $id)
                ->first();

            if (!$config) {
                return $this->errorResponse('Configuration not found', 404);
            }

            $validator = Validator::make($request->all(), [
                'rows' => 'required|array|min:1',
                'rows.*.row_no' => 'required|integer|min:1',
                'rows.*.column_count' => 'required|integer|min:1',
                'rows.*.row_label' => 'nullable|string|max:100',
                'rows.*.meaning' => 'nullable|string|max:200',
                'rows.*.price' => 'nullable|numeric|min:0'
            ]);

            if ($validator->fails()) {
                return $this->errorResponse($validator->errors()->first(), 422);
            }

            // Check if units already exist
            $unitCount = LightUnit::where('config_id', $id)->count();
            if ($unitCount > 0) {
                return $this->errorResponse('Cannot modify rows after units have been generated. Please delete units first.', 400);
            }

            DB::beginTransaction();
            try {
                // Delete existing rows
                LightLayoutRow::where('config_id', $id)->delete();

                // Insert new rows
                foreach ($request->rows as $rowData) {
                    LightLayoutRow::create([
                        'config_id' => $id,
                        'row_no' => $rowData['row_no'],
                        'column_count' => $rowData['column_count'],
                        'row_label' => $rowData['row_label'] ?? null,
                        'meaning' => $rowData['meaning'] ?? null,
                        'price' => $rowData['price'] ?? null,
                        'sort_order' => $rowData['row_no']
                    ]);
                }

                DB::commit();

                $rows = LightLayoutRow::where('config_id', $id)->ordered()->get();

                return $this->successResponse($rows, 'Rows saved successfully');
            } catch (\Exception $e) {
                DB::rollBack();
                throw $e;
            }
        } catch (\Exception $e) {
            return $this->errorResponse('Failed to save rows: ' . $e->getMessage(), 500);
        }
    }

    /**
     * Generate Pagoda Tower template (26 rows)
     * POST /api/v1/light-configs/{id}/generate-pagoda-template
     */
    public function generatePagodaTemplate(Request $request, $id)
    {
        try {
            $temple = $request->input('current_temple');
            
            $config = LightLayoutConfig::forTemple($temple['id'])
                ->where('config_id', $id)
                ->where('type', 'PAGODA_TOWER')
                ->first();

            if (!$config) {
                return $this->errorResponse('Pagoda Tower configuration not found', 404);
            }

            $validator = Validator::make($request->all(), [
                'start_column_count' => 'required|integer|min:1',
                'total_rows' => 'required|integer|min:1|max:50',
                'base_price' => 'nullable|numeric|min:0',
                'price_decrement' => 'nullable|numeric|min:0'
            ]);

            if ($validator->fails()) {
                return $this->errorResponse($validator->errors()->first(), 422);
            }

            $startColumnCount = $request->start_column_count; // e.g., 14
            $totalRows = $request->total_rows; // e.g., 26
            $basePrice = $request->base_price ?? 500;
            $priceDecrement = $request->price_decrement ?? 15;

            $rows = [];
            for ($i = 1; $i <= $totalRows; $i++) {
                $columnCount = $startColumnCount + ($i - 1);
                $price = max(100, $basePrice - (($i - 1) * $priceDecrement));
                
                $rows[] = [
                    'row_no' => $i,
                    'column_count' => $columnCount,
                    'row_label' => $i === 1 ? 'Inner Ring' : ($i === $totalRows ? 'Outer Ring' : "Ring $i"),
                    'meaning' => $i === 1 ? 'Premium' : ($i === $totalRows ? 'Basic' : ''),
                    'price' => $price
                ];
            }

            return $this->successResponse([
                'rows' => $rows,
                'total_rows' => $totalRows,
                'total_units' => array_sum(array_column($rows, 'column_count'))
            ], 'Pagoda template generated successfully');
        } catch (\Exception $e) {
            return $this->errorResponse('Failed to generate template: ' . $e->getMessage(), 500);
        }
    }

    /**
     * Generate units from rows (Cinema Seat Rule)
     * POST /api/v1/light-configs/{id}/generate-units
     */
    public function generateUnits(Request $request, $id)
    {
        try {
            $temple = $request->input('current_temple');
            
            $config = LightLayoutConfig::forTemple($temple['id'])
                ->where('config_id', $id)
                ->first();

            if (!$config) {
                return $this->errorResponse('Configuration not found', 404);
            }

            // Check if rows exist
            $rows = LightLayoutRow::where('config_id', $id)->get();
            if ($rows->isEmpty()) {
                return $this->errorResponse('Please define rows before generating units', 400);
            }

            // Check if units already exist
            $existingUnits = LightUnit::where('config_id', $id)->count();
            if ($existingUnits > 0) {
                return $this->errorResponse('Units already exist. Delete existing units first to regenerate.', 400);
            }

            DB::beginTransaction();
            try {
                $totalUnits = 0;

                foreach ($rows as $row) {
                    // Generate EXACTLY column_count units for this row
                    for ($col = 1; $col <= $row->column_count; $col++) {
                        LightUnit::create([
                            'config_id' => $id,
                            'row_no' => $row->row_no,
                            'col_no' => $col,
                            'unit_code' => sprintf('R%02d-C%02d', $row->row_no, $col),
                            'status' => 'AVAILABLE'
                        ]);
                        $totalUnits++;
                    }
                }

                DB::commit();

                return $this->successResponse([
                    'total_units' => $totalUnits,
                    'total_rows' => $rows->count(),
                    'config' => $config
                ], "$totalUnits units generated successfully");
            } catch (\Exception $e) {
                DB::rollBack();
                throw $e;
            }
        } catch (\Exception $e) {
            return $this->errorResponse('Failed to generate units: ' . $e->getMessage(), 500);
        }
    }

    /**
     * Delete all units for a configuration
     * DELETE /api/v1/light-configs/{id}/units
     */
    public function deleteUnits(Request $request, $id)
    {
        try {
            $temple = $request->input('current_temple');
            
            $config = LightLayoutConfig::forTemple($temple['id'])
                ->where('config_id', $id)
                ->first();

            if (!$config) {
                return $this->errorResponse('Configuration not found', 404);
            }

            // Check if any units are booked
            $bookedCount = LightUnit::where('config_id', $id)
                ->whereIn('status', ['BOOKED', 'RESERVED'])
                ->count();

            if ($bookedCount > 0) {
                return $this->errorResponse("Cannot delete units. $bookedCount units are currently booked or reserved.", 400);
            }

            $deletedCount = LightUnit::where('config_id', $id)->delete();

            return $this->successResponse([
                'deleted_count' => $deletedCount
            ], "$deletedCount units deleted successfully");
        } catch (\Exception $e) {
            return $this->errorResponse('Failed to delete units: ' . $e->getMessage(), 500);
        }
    }

    /**
     * Delete a configuration
     * DELETE /api/v1/light-configs/{id}
     */
    public function destroy(Request $request, $id)
    {
        try {
            $temple = $request->input('current_temple');
            
            $config = LightLayoutConfig::forTemple($temple['id'])
                ->where('config_id', $id)
                ->first();

            if (!$config) {
                return $this->errorResponse('Configuration not found', 404);
            }

            // Check if any bookings exist
            if ($config->bookings()->count() > 0) {
                return $this->errorResponse('Cannot delete configuration with existing bookings', 400);
            }

            // Delete will cascade to rows and units
            $config->delete();

            return $this->successResponse(null, 'Configuration deleted successfully');
        } catch (\Exception $e) {
            return $this->errorResponse('Failed to delete configuration: ' . $e->getMessage(), 500);
        }
    }
}
