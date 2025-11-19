<?php

namespace App\Http\Controllers;

use Illuminate\Http\Request;

use App\Models\OpeningStock;
use App\Models\Product;
use App\Models\Warehouse;

use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Validator;
use Illuminate\Support\Facades\Auth;

class OpeningStockController extends Controller
{
    public function getProductOpeningStock($productId)
    {
        try {
            $openingStock = OpeningStock::with(['warehouse', 'createdBy', 'updatedBy'])
                ->where('product_id', $productId)
                ->where('is_active', true)
                ->orderBy('id', 'desc')
                ->get();
            
            $summary = [
                'total_quantity' => $openingStock->sum('quantity'),
                'total_value' => $openingStock->sum('total_value'),
                'warehouse_count' => $openingStock->pluck('warehouse_id')->unique()->count()
            ];
            
            return response()->json([
                'success' => true,
                'data' => $openingStock,
                'summary' => $summary
            ]);
            
        } catch (\Exception $e) {
            return response()->json([
                'success' => false,
                'message' => 'Error fetching opening stock: ' . $e->getMessage()
            ], 500);
        }
    }
    
    public function store(Request $request)
    {
        $validator = Validator::make($request->all(), [
            'product_id' => 'required|exists:products,id',
            'warehouse_id' => 'required|exists:warehouses,id',
            'quantity' => 'required|numeric|min:0',
            'unit_price' => 'required|numeric|min:0',
  
            'reference_no' => 'nullable|string|max:100',
            'notes' => 'nullable|string'
        ]);
        
        if ($validator->fails()) {
            return response()->json([
                'success' => false,
                'errors' => $validator->errors()
            ], 422);
        }
        
        DB::beginTransaction();
        try {
            $data = $request->all();
            $data['created_by'] = Auth::id();
            $data['total_value'] = $data['quantity'] * $data['unit_price'];
            $data['is_active'] = true;
            
            // Create opening stock entry
            $openingStock = OpeningStock::create($data);
            
            // Update product current stock
            $this->updateProductStock($data['product_id']);
            
            DB::commit();
            
            return response()->json([
                'success' => true,
                'message' => 'Opening stock added successfully',
                'data' => $openingStock->load(['warehouse', 'product'])
            ], 201);
            
        } catch (\Exception $e) {
            DB::rollback();
            return response()->json([
                'success' => false,
                'message' => 'Error adding opening stock: ' . $e->getMessage()
            ], 500);
        }
    }
    
    public function update(Request $request, $id)
    {
        $validator = Validator::make($request->all(), [
            'quantity' => 'required|numeric|min:0',
            'unit_price' => 'required|numeric|min:0',
     
            'reference_no' => 'nullable|string|max:100',
            'notes' => 'nullable|string'
        ]);
        
        if ($validator->fails()) {
            return response()->json([
                'success' => false,
                'errors' => $validator->errors()
            ], 422);
        }
        
        DB::beginTransaction();
        try {
            $openingStock = OpeningStock::findOrFail($id);
            
            $data = $request->only(['quantity', 'unit_price','reference_no', 'notes']);
            $data['updated_by'] = Auth::id();
            $data['total_value'] = $data['quantity'] * $data['unit_price'];
            
            $openingStock->update($data);
            
            // Update product current stock
            $this->updateProductStock($openingStock->product_id);
            
            DB::commit();
            
            return response()->json([
                'success' => true,
                'message' => 'Opening stock updated successfully',
                'data' => $openingStock->load(['warehouse', 'product'])
            ]);
            
        } catch (\Exception $e) {
            DB::rollback();
            return response()->json([
                'success' => false,
                'message' => 'Error updating opening stock: ' . $e->getMessage()
            ], 500);
        }
    }
    
    public function destroy($id)
    {
        DB::beginTransaction();
        try {
            $openingStock = OpeningStock::findOrFail($id);
            $productId = $openingStock->product_id;
            
            // Soft delete by marking as inactive
            $openingStock->update([
                'is_active' => false,
                'updated_by' => Auth::id()
            ]);
            
            // Update product current stock
            $this->updateProductStock($productId);
            
            DB::commit();
            
            return response()->json([
                'success' => true,
                'message' => 'Opening stock removed successfully'
            ]);
            
        } catch (\Exception $e) {
            DB::rollback();
            return response()->json([
                'success' => false,
                'message' => 'Error removing opening stock: ' . $e->getMessage()
            ], 500);
        }
    }
    
    public function getHistory($productId)
    {
        try {
            $history = OpeningStock::with(['warehouse', 'createdBy', 'updatedBy'])
                ->where('product_id', $productId)
                ->orderBy('created_at', 'desc')
                ->paginate(20);
            
            return response()->json([
                'success' => true,
                'data' => $history
            ]);
            
        } catch (\Exception $e) {
            return response()->json([
                'success' => false,
                'message' => 'Error fetching history: ' . $e->getMessage()
            ], 500);
        }
    }
    
    public function getWarehouseStock(Request $request)
    {
        try {
            $productId = $request->product_id;
            $warehouseId = $request->warehouse_id;
            
            $query = OpeningStock::with(['product', 'warehouse'])
                ->where('is_active', true);
            
            if ($productId) {
                $query->where('product_id', $productId);
            }
            
            if ($warehouseId) {
                $query->where('warehouse_id', $warehouseId);
            }
            
            $stock = $query->get()
                ->groupBy('warehouse_id')
                ->map(function ($items) {
                    return [
                        'warehouse' => $items->first()->warehouse,
                        'total_quantity' => $items->sum('quantity'),
                        'total_value' => $items->sum('total_value'),
                        'product_count' => $items->pluck('product_id')->unique()->count()
                    ];
                });
            
            return response()->json([
                'success' => true,
                'data' => $stock
            ]);
            
        } catch (\Exception $e) {
            return response()->json([
                'success' => false,
                'message' => 'Error fetching warehouse stock: ' . $e->getMessage()
            ], 500);
        }
    }
    
    private function updateProductStock($productId)
    {
        $totalQuantity = OpeningStock::where('product_id', $productId)
            ->where('is_active', true)
            ->sum('quantity');
        
        Product::where('id', $productId)->update([
            'current_stock' => $totalQuantity
        ]);
    }
}