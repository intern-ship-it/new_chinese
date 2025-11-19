<?php
// app/Http/Controllers/UomController.php 

namespace App\Http\Controllers;

use App\Http\Controllers\Controller;
use App\Models\Uom;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Validator;
use Illuminate\Support\Facades\Auth;



class UomController extends Controller
{
    public function index(Request $request)
    {
        try {
            $query = DB::table('uoms')
                ->leftJoin('uoms as base', 'uoms.base_unit', '=', 'base.id')
                ->select(
                    'uoms.*',
                    'base.name as base_unit_name',
                    'base.uom_short as base_unit_short'
                );

            if ($request->has('is_active')) {
                $query->where('uoms.is_active', $request->is_active);
            }

            $uoms = $query->orderBy('uoms.name', 'asc')->get();
            $user = Auth::user();

            $permissions = [
                'can_create_uom' => $user->can('uom.create'),
                'can_edit_uom' => $user->can('uom.edit'),
                'can_delete_uom' => $user->can('uom.delete'),
                'can_view_uom' => $user->can('uom.view'),
            ];
            return response()->json([
                'success' => true,
                'data' => $uoms,
                'permissions' => $permissions
            ]);
        } catch (\Exception $e) {
            return response()->json([
                'success' => false,
                'message' => 'Error fetching UOMs: ' . $e->getMessage()
            ], 500);
        }
    }

    public function store(Request $request)
    {
        if (!Auth::user()->can('uom.create')) {
            return response()->json([
                'success' => false,
                'message' => 'You do not have permission to create uom'
            ], 403);
        }
        $validator = Validator::make($request->all(), [
            'name' => 'required|string|max:255',
            'uom_short' => 'required|string|max:100|unique:uoms',
            'base_unit' => 'nullable|exists:uoms,id',
            'conversion_factor' => 'nullable|numeric|min:0.0001',
            'is_active' => 'nullable|in:0,1'
        ]);

        if ($validator->fails()) {
            return response()->json([
                'success' => false,
                'errors' => $validator->errors()
            ], 422);
        }

        DB::beginTransaction();
        try {
            $data = [
                'name' => $request->name,
                'uom_short' => strtoupper($request->uom_short),
                'base_unit' => $request->base_unit ?: null,
                'conversion_factor' => $request->base_unit ? $request->conversion_factor : 1.0000,
                'is_active' => $request->is_active ?? 1,
            ];

            $id = DB::table('uoms')->insertGetId($data);

            DB::commit();

            $uom = DB::table('uoms')->where('id', $id)->first();

            return response()->json([
                'success' => true,
                'message' => 'UOM created successfully',
                'data' => $uom
            ], 201);
        } catch (\Exception $e) {
            DB::rollback();
            return response()->json([
                'success' => false,
                'message' => 'Error creating UOM: ' . $e->getMessage()
            ], 500);
        }
    }

    public function update(Request $request, $id)
    {
        if (!Auth::user()->can('uom.edit')) {
            return response()->json([
                'success' => false,
                'message' => 'You do not have permission to edit uom'
            ], 403);
        }
        $validator = Validator::make($request->all(), [
            'name' => 'required|string|max:255',
            'uom_short' => 'required|string|max:100|unique:uoms,uom_short,' . $id,
            'base_unit' => 'nullable|exists:uoms,id|not_in:' . $id,
            'conversion_factor' => 'nullable|numeric|min:0.0001',
            'is_active' => 'nullable|in:0,1'
        ]);

        if ($validator->fails()) {
            return response()->json([
                'success' => false,
                'errors' => $validator->errors()
            ], 422);
        }

        DB::beginTransaction();
        try {
            $data = [
                'name' => $request->name,
                'uom_short' => strtoupper($request->uom_short),
                'base_unit' => $request->base_unit ?: null,
                'conversion_factor' => $request->base_unit ? $request->conversion_factor : 1.0000,
                'is_active' => $request->is_active ?? 1,
            ];

            DB::table('uoms')->where('id', $id)->update($data);

            DB::commit();

            $uom = DB::table('uoms')->where('id', $id)->first();

            return response()->json([
                'success' => true,
                'message' => 'UOM updated successfully',
                'data' => $uom
            ]);
        } catch (\Exception $e) {
            DB::rollback();
            return response()->json([
                'success' => false,
                'message' => 'Error updating UOM: ' . $e->getMessage()
            ], 500);
        }
    }

    public function destroy($id)
    {
        // Check if UOM is in use
        $isUsed = DB::table('inventory_items')
            ->where('uom_id', $id)
            ->orWhere('purchase_uom_id', $id)
            ->exists();

        if ($isUsed) {
            return response()->json([
                'success' => false,
                'message' => 'Cannot delete UOM that is in use'
            ], 422);
        }

        // Check for derived units
        $hasDerived = DB::table('uoms')->where('base_unit', $id)->exists();

        if ($hasDerived) {
            return response()->json([
                'success' => false,
                'message' => 'Cannot delete UOM with derived units'
            ], 422);
        }

        DB::beginTransaction();
        try {
            DB::table('uoms')->where('id', $id)->delete();

            DB::commit();

            return response()->json([
                'success' => true,
                'message' => 'UOM deleted successfully'
            ]);
        } catch (\Exception $e) {
            DB::rollback();
            return response()->json([
                'success' => false,
                'message' => 'Error deleting UOM: ' . $e->getMessage()
            ], 500);
        }
    }
}
