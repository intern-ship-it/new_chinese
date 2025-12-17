<?php

namespace App\Http\Controllers\API;

use App\Http\Controllers\Controller;
use App\Models\SaleSession;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Validator;
use Exception;

class SaleSessionController extends Controller
{
    /**
     * Display a listing of sale sessions
     */
    public function index(Request $request)
    {
        try {
            $query = SaleSession::query();

            // Filter by status
            if ($request->has('status')) {
                $query->where('status', $request->boolean('status'));
            }

            // Search filter
            if ($request->has('search')) {
                $search = $request->search;
                $query->where('name', 'ILIKE', "%{$search}%");
            }

            // Order by
            $query->ordered();

            $sessions = $query->get();

            return response()->json([
                'success' => true,
                'data' => $sessions
            ]);
        } catch (Exception $e) {
            return response()->json([
                'success' => false,
                'message' => 'Failed to fetch sale sessions',
                'error' => $e->getMessage()
            ], 500);
        }
    }

    /**
     * Get all active sale sessions
     */
    public function active()
    {
        try {
            $sessions = SaleSession::active()->ordered()->get();

            return response()->json([
                'success' => true,
                'data' => $sessions
            ]);
        } catch (Exception $e) {
            return response()->json([
                'success' => false,
                'message' => 'Failed to fetch active sale sessions',
                'error' => $e->getMessage()
            ], 500);
        }
    }

    /**
     * Store a newly created sale session
     */
    public function store(Request $request)
    {
        $validator = Validator::make($request->all(), [
            'name' => 'required|string|max:255',
            'from_time' => 'required|date_format:H:i',
            'to_time' => 'required|date_format:H:i|after:from_time',
            'status' => 'boolean',
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

            $session = SaleSession::create([
                'name' => $request->name,
                'from_time' => $request->from_time,
                'to_time' => $request->to_time,
                'status' => $request->boolean('status', true),
                'created_by' => $request->user()->id ?? null,
            ]);

            DB::commit();

            return response()->json([
                'success' => true,
                'message' => 'Sale session created successfully',
                'data' => $session
            ], 201);
        } catch (Exception $e) {
            DB::rollBack();
            return response()->json([
                'success' => false,
                'message' => 'Failed to create sale session',
                'error' => $e->getMessage()
            ], 500);
        }
    }

    /**
     * Display the specified sale session
     */
    public function show($id)
    {
        try {
            $session = SaleSession::with(['saleItems'])->findOrFail($id);

            return response()->json([
                'success' => true,
                'data' => $session
            ]);
        } catch (Exception $e) {
            return response()->json([
                'success' => false,
                'message' => 'Sale session not found',
                'error' => $e->getMessage()
            ], 404);
        }
    }

    /**
     * Update the specified sale session
     */
    public function update(Request $request, $id)
    {
        $validator = Validator::make($request->all(), [
            'name' => 'required|string|max:255',
            'from_time' => 'required|date_format:H:i',
            'to_time' => 'required|date_format:H:i|after:from_time',
            'status' => 'boolean',
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

            $session = SaleSession::findOrFail($id);
            $session->update([
                'name' => $request->name,
                'from_time' => $request->from_time,
                'to_time' => $request->to_time,
                'status' => $request->boolean('status', true),
                'updated_by' => $request->user()->id ?? null,
            ]);

            DB::commit();

            return response()->json([
                'success' => true,
                'message' => 'Sale session updated successfully',
                'data' => $session
            ]);
        } catch (Exception $e) {
            DB::rollBack();
            return response()->json([
                'success' => false,
                'message' => 'Failed to update sale session',
                'error' => $e->getMessage()
            ], 500);
        }
    }

    /**
     * Remove the specified sale session
     */
    public function destroy($id)
    {
        try {
            DB::beginTransaction();

            $session = SaleSession::findOrFail($id);
            
            // Check if session is being used by any sale items
            $itemsCount = $session->saleItems()->count();
            if ($itemsCount > 0) {
                return response()->json([
                    'success' => false,
                    'message' => "Cannot delete session. It is being used by {$itemsCount} sale item(s)."
                ], 422);
            }

            $session->delete();

            DB::commit();

            return response()->json([
                'success' => true,
                'message' => 'Sale session deleted successfully'
            ]);
        } catch (Exception $e) {
            DB::rollBack();
            return response()->json([
                'success' => false,
                'message' => 'Failed to delete sale session',
                'error' => $e->getMessage()
            ], 500);
        }
    }
}