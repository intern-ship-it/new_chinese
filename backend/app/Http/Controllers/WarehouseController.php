<?php
// app/Http/Controllers/WarehouseController.php

namespace App\Http\Controllers;

use App\Http\Controllers\Controller;
use App\Models\Warehouse;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Validator;
use Illuminate\Support\Facades\Auth;
use Carbon\Carbon;

class WarehouseController extends Controller
{
    /**
     * Generate warehouse code in format WA20250001
     * Resets sequence each year, unique per temple
     */
    private function generateWarehouseCode()
    {
        $year = Carbon::now()->year;
        $prefix = 'WA' . $year;

        // Get the last warehouse code for the current year and temple
        $lastWarehouse = Warehouse::where('code', 'LIKE', $prefix . '%')
            ->orderBy('code', 'desc')
            ->first();

        if ($lastWarehouse) {
            // Extract the sequence number from the last code
            $lastSequence = (int) substr($lastWarehouse->code, -4);
            $newSequence = $lastSequence + 1;
        } else {
            // First warehouse of the year
            $newSequence = 1;
        }

        // Format the sequence with leading zeros (4 digits)
        $sequenceStr = str_pad($newSequence, 4, '0', STR_PAD_LEFT);

        return $prefix . $sequenceStr;
    }

    public function index(Request $request)
    {
        try {
            $warehouses = Warehouse::orderBy('code', 'desc')->get();

            $user = Auth::user();

            $permissions = [
                'can_create_warehouses' => $user->can('warehouses.create'),
                'can_edit_warehouses' => $user->can('warehouses.edit'),
                'can_delete_warehouses' => $user->can('warehouses.delete'),
                'can_view_warehouses' => $user->can('warehouses.view'),
            ];
            return response()->json([
                'success' => true,
                'data' => $warehouses,
                'permissions' => $permissions
            ]);
        } catch (\Exception $e) {
            return response()->json([
                'success' => false,
                'message' => 'Error fetching warehouses: ' . $e->getMessage()
            ], 500);
        }
    }

    public function store(Request $request)
    {
        if (!Auth::user()->can('warehouses.create')) {
            return response()->json([
                'success' => false,
                'message' => 'You do not have permission to create warehouses'
            ], 403);
        }
        $validator = Validator::make($request->all(), [
            'name' => 'required|string|max:255',
            'description' => 'nullable|string',
            'is_active' => 'nullable|boolean'
        ]);

        if ($validator->fails()) {
            return response()->json([
                'success' => false,
                'errors' => $validator->errors()
            ], 422);
        }

        DB::beginTransaction();
        try {
            // Generate the warehouse code
            $code = $this->generateWarehouseCode();

            // Check for duplicate name within the same temple
            $existingWarehouse = Warehouse::where('name', $request->name)
                ->first();

            if ($existingWarehouse) {
                return response()->json([
                    'success' => false,
                    'message' => 'A warehouse with this name already exists'
                ], 422);
            }

            $warehouse = Warehouse::create([
                'code' => $code,
                'name' => $request->name,
                'description' => $request->description,
                'is_active' => $request->is_active ?? true,
                'created_by' => Auth::id(),
                'updated_by' => Auth::id()
            ]);

            DB::commit();

            return response()->json([
                'success' => true,
                'message' => 'Warehouse created successfully with code: ' . $code,
                'data' => $warehouse
            ], 201);
        } catch (\Exception $e) {
            DB::rollback();
            return response()->json([
                'success' => false,
                'message' => 'Error creating warehouse: ' . $e->getMessage()
            ], 500);
        }
    }

    public function show($id)
    {
        try {
            $warehouse = Warehouse::findOrFail($id);
            $user = Auth::user();
            $permissions = [
                'can_edit_warehouses' => $user->can('warehouses.edit'),
                'can_delete_warehouses' => $user->can('warehouses.delete'),
            ];
            return response()->json([
                'success' => true,
                'data' => $warehouse,
                'permissions' => $permissions
            ]);
        } catch (\Exception $e) {
            return response()->json([
                'success' => false,
                'message' => 'Warehouse not found'
            ], 404);
        }
    }

    public function update(Request $request, $id)
    {
        if (!Auth::user()->can('warehouses.edit')) {
            return response()->json([
                'success' => false,
                'message' => 'You do not have permission to edit warehouses'
            ], 403);
        }
        $validator = Validator::make($request->all(), [
            'name' => 'required|string|max:255',
            'description' => 'nullable|string',
            'is_active' => 'nullable|boolean'
        ]);

        if ($validator->fails()) {
            return response()->json([
                'success' => false,
                'errors' => $validator->errors()
            ], 422);
        }

        DB::beginTransaction();
        try {
            $warehouse = Warehouse::findOrFail($id);

            // Check for duplicate name within the same temple (excluding current warehouse)
            $existingWarehouse = Warehouse::where('name', $request->name)
                ->where('id', '!=', $id)
                ->first();

            if ($existingWarehouse) {
                return response()->json([
                    'success' => false,
                    'message' => 'A warehouse with this name already exists'
                ], 422);
            }

            // Note: We don't update the code - it remains the same
            $warehouse->update([
                'name' => $request->name,
                'description' => $request->description,
                'is_active' => $request->has('is_active') ? (int)($request->is_active ? 1 : 0) : $warehouse->is_active,
                'updated_by' => Auth::id()
            ]);

            DB::commit();

            return response()->json([
                'success' => true,
                'message' => 'Warehouse updated successfully',
                'data' => $warehouse
            ]);
        } catch (\Exception $e) {
            DB::rollback();
            return response()->json([
                'success' => false,
                'message' => 'Error updating warehouse: ' . $e->getMessage()
            ], 500);
        }
    }

    public function destroy($id)
    {
        if (!Auth::user()->can('warehouses.delete')) {
            return response()->json([
                'success' => false,
                'message' => 'You do not have permission to delete warehouses'
            ], 403);
        }
        DB::beginTransaction();
        try {
            $warehouse = Warehouse::findOrFail($id);

            // Check if warehouse is being used in inventory or other modules
            // Add your validation logic here
            // Example:
            // if ($warehouse->products()->exists()) {
            //     return response()->json([
            //         'success' => false,
            //         'message' => 'Cannot delete warehouse. It has associated products.'
            //     ], 400);
            // }

            $warehouse->delete();

            DB::commit();

            return response()->json([
                'success' => true,
                'message' => 'Warehouse deleted successfully'
            ]);
        } catch (\Exception $e) {
            DB::rollback();
            return response()->json([
                'success' => false,
                'message' => 'Error deleting warehouse: ' . $e->getMessage()
            ], 500);
        }
    }

    public function toggleStatus($id)
    {
        DB::beginTransaction();
        try {
            $warehouse = Warehouse::findOrFail($id);

            $warehouse->is_active = !$warehouse->is_active;
            $warehouse->updated_by = Auth::id();
            $warehouse->save();

            DB::commit();

            return response()->json([
                'success' => true,
                'message' => 'Warehouse status updated successfully',
                'data' => $warehouse
            ]);
        } catch (\Exception $e) {
            DB::rollback();
            return response()->json([
                'success' => false,
                'message' => 'Error updating status: ' . $e->getMessage()
            ], 500);
        }
    }
}
