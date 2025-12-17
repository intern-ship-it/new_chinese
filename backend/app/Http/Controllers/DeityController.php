<?php

namespace App\Http\Controllers\API;

use App\Http\Controllers\Controller;
use App\Models\Deity;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Validator;
use Exception;

class DeityController extends Controller
{
    /**
     * Display a listing of deities
     */
    public function index(Request $request)
    {
        try {
            $query = Deity::query();

            // Filter by status
            if ($request->has('status')) {
                $query->where('status', $request->boolean('status'));
            }

            // Search filter
            if ($request->has('search')) {
                $search = $request->search;
                $query->where(function ($q) use ($search) {
                    $q->where('name', 'ILIKE', "%{$search}%")
                      ->orWhere('name_secondary', 'ILIKE', "%{$search}%")
                      ->orWhere('deity_code', 'ILIKE', "%{$search}%");
                });
            }

            // Order by
            $query->ordered();

            $deities = $query->get();

            return response()->json([
                'success' => true,
                'data' => $deities
            ]);
        } catch (Exception $e) {
            return response()->json([
                'success' => false,
                'message' => 'Failed to fetch deities',
                'error' => $e->getMessage()
            ], 500);
        }
    }

    /**
     * Get all active deities
     */
    public function active()
    {
        try {
            $deities = Deity::active()->ordered()->get();

            return response()->json([
                'success' => true,
                'data' => $deities
            ]);
        } catch (Exception $e) {
            return response()->json([
                'success' => false,
                'message' => 'Failed to fetch active deities',
                'error' => $e->getMessage()
            ], 500);
        }
    }

    /**
     * Store a newly created deity
     */
    public function store(Request $request)
    {
        $validator = Validator::make($request->all(), [
            'deity_code' => 'required|string|max:50|unique:deities,deity_code',
            'name' => 'required|string|max:255',
            'name_secondary' => 'nullable|string|max:255',
            'description' => 'nullable|string',
            'image_url' => 'nullable|string|max:500',
            'status' => 'boolean',
            'order_no' => 'integer|min:0',
        ]);

        if ($validator->fails()) {
            return response()->json([
                'success' => false,
                'message' => 'Validation failed',
                'errors' => $validator->errors()
            ], 422);
        }

        try {
            DB::beginTransaction();

            $deity = Deity::create([
                'deity_code' => strtoupper($request->deity_code),
                'name' => $request->name,
                'name_secondary' => $request->name_secondary,
                'description' => $request->description,
                'image_url' => $request->image_url,
                'status' => $request->boolean('status', true),
                'order_no' => $request->order_no ?? 0,
                'created_by' => $request->user()->id ?? null,
            ]);

            DB::commit();

            return response()->json([
                'success' => true,
                'message' => 'Deity created successfully',
                'data' => $deity
            ], 201);
        } catch (Exception $e) {
            DB::rollBack();
            return response()->json([
                'success' => false,
                'message' => 'Failed to create deity',
                'error' => $e->getMessage()
            ], 500);
        }
    }

    /**
     * Display the specified deity
     */
    public function show($id)
    {
        try {
            $deity = Deity::with(['saleItems'])->findOrFail($id);

            return response()->json([
                'success' => true,
                'data' => $deity
            ]);
        } catch (Exception $e) {
            return response()->json([
                'success' => false,
                'message' => 'Deity not found',
                'error' => $e->getMessage()
            ], 404);
        }
    }

    /**
     * Update the specified deity
     */
    public function update(Request $request, $id)
    {
        $validator = Validator::make($request->all(), [
            'deity_code' => 'required|string|max:50|unique:deities,deity_code,' . $id,
            'name' => 'required|string|max:255',
            'name_secondary' => 'nullable|string|max:255',
            'description' => 'nullable|string',
            'image_url' => 'nullable|string|max:500',
            'status' => 'boolean',
            'order_no' => 'integer|min:0',
        ]);

        if ($validator->fails()) {
            return response()->json([
                'success' => false,
                'message' => 'Validation failed',
                'errors' => $validator->errors()
            ], 422);
        }

        try {
            DB::beginTransaction();

            $deity = Deity::findOrFail($id);
            $deity->update([
                'deity_code' => strtoupper($request->deity_code),
                'name' => $request->name,
                'name_secondary' => $request->name_secondary,
                'description' => $request->description,
                'image_url' => $request->image_url,
                'status' => $request->boolean('status', true),
                'order_no' => $request->order_no ?? 0,
                'updated_by' => $request->user()->id ?? null,
            ]);

            DB::commit();

            return response()->json([
                'success' => true,
                'message' => 'Deity updated successfully',
                'data' => $deity
            ]);
        } catch (Exception $e) {
            DB::rollBack();
            return response()->json([
                'success' => false,
                'message' => 'Failed to update deity',
                'error' => $e->getMessage()
            ], 500);
        }
    }

    /**
     * Remove the specified deity
     */
    public function destroy($id)
    {
        try {
            DB::beginTransaction();

            $deity = Deity::findOrFail($id);
            
            // Check if deity is being used by any sale items
            $itemsCount = $deity->saleItems()->count();
            if ($itemsCount > 0) {
                return response()->json([
                    'success' => false,
                    'message' => "Cannot delete deity. It is being used by {$itemsCount} sale item(s)."
                ], 422);
            }

            $deity->delete();

            DB::commit();

            return response()->json([
                'success' => true,
                'message' => 'Deity deleted successfully'
            ]);
        } catch (Exception $e) {
            DB::rollBack();
            return response()->json([
                'success' => false,
                'message' => 'Failed to delete deity',
                'error' => $e->getMessage()
            ], 500);
        }
    }
}