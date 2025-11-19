<?php

namespace App\Http\Controllers;

use App\Models\StockMovement;
use App\Models\StockBalance;
use App\Models\Product;
use App\Models\Uom;
use App\Models\Warehouse;
use App\Services\StockService;
use App\Services\S3UploadService;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Validator;
use Illuminate\Support\Facades\Log;
use App\Exports\StockMovementsExport;
use Maatwebsite\Excel\Facades\Excel;
use App\Models\SystemSetting;
use PDF;
use Illuminate\Support\Facades\Auth;

class StockMovementController extends Controller
{
    protected $stockService;
    protected $s3Service;

    public function __construct(StockService $stockService, S3UploadService $s3Service)
    {
        $this->stockService = $stockService;
        $this->s3Service = $s3Service;
    }


    /**
     * Get stock movements with filters
     */
    public function index(Request $request)
    {
        $query = StockMovement::with(['product.uom.baseUnit', 'warehouse', 'creator']);

        // Apply filters
        if ($request->has('from_date') && !empty($request->from_date)) {
            $query->whereDate('created_at', '>=', $request->from_date);
        }

        if ($request->has('to_date') && !empty($request->to_date)) {
            $query->whereDate('created_at', '<=', $request->to_date);
        }

        if ($request->has('product_id')) {
            $query->where('product_id', $request->product_id);
        }

        if ($request->has('warehouse_id')) {
            $query->where('warehouse_id', $request->warehouse_id);
        }

        if ($request->has('movement_type')) {
            $query->where('movement_type', $request->movement_type);
        }

        $movements = $query->orderBy('created_at', 'desc')
            ->paginate($request->get('limit', 20));
        $user = Auth::user();

        $permissions = [
            'can_stock_view' => $user->can('stock.view'),
            'can_stock_in' => $user->can('stock.in'),
            'can_stock_out' => $user->can('stock.out'),
        ];
        return response()->json([
            'success' => true,
            'data' => $movements,
            'permissions' => $permissions
        ]);
    }

    /**
     * Direct stock in (like your CodeIgniter implementation)
     */
    public function directStockIn(Request $request)
    {
        $validator = Validator::make($request->all(), [
            'product_id' => 'required|exists:products,id',
            'warehouse_id' => 'required|exists:warehouses,id',
            'quantity' => 'required|numeric|min:0.001',
            'unit_cost' => 'nullable|numeric|min:0',
            'batch_number' => 'nullable|string|max:50',
            'expiry_date' => 'nullable|date|after:today',
            'notes' => 'nullable|string|max:500'
        ]);

        if ($validator->fails()) {
            return response()->json([
                'success' => false,
                'errors' => $validator->errors()
            ], 422);
        }

        DB::beginTransaction();
        try {
            // Create stock movement
            $movement = StockMovement::create([
                'product_id' => $request->product_id,
                'warehouse_id' => $request->warehouse_id,
                'movement_type' => 'IN',
                'movement_subtype' => 'OPENING_STOCK',
                'quantity' => $request->quantity,
                'unit_cost' => $request->unit_cost ?? 0,
                'total_cost' => ($request->quantity * ($request->unit_cost ?? 0)),
                'batch_number' => $request->batch_number,
                'expiry_date' => $request->expiry_date,
                'reference_type' => 'DIRECT',
                'reference_number' => 'STK-IN-' . date('YmdHis'),
                'notes' => $request->notes,
                'created_by' => auth()->id(),
                'approval_status' => 'APPROVED',
                'approved_by' => auth()->id(),
                'approved_at' => now()
            ]);

            // Update stock balance
            $this->stockService->updateStockBalance(
                $request->product_id,
                $request->warehouse_id,
                $request->quantity,
                'IN'
            );

            // Update product average cost
            if ($request->unit_cost > 0) {
                $this->stockService->updateAverageCost(
                    $request->product_id,
                    $request->unit_cost,
                    $request->quantity
                );
            }

            DB::commit();

            return response()->json([
                'success' => true,
                'message' => 'Stock added successfully',
                'data' => $movement->load(['product', 'warehouse'])
            ]);
        } catch (\Exception $e) {
            DB::rollback();
            return response()->json([
                'success' => false,
                'message' => 'Failed to add stock: ' . $e->getMessage()
            ], 500);
        }
    }

    /**
     * Manual stock out (matching CodeIgniter implementation)
     */
    public function manualStockOut(Request $request)
    {
        $validator = Validator::make($request->all(), [
            'product_id' => 'required|exists:products,id',
            'warehouse_id' => 'required|exists:warehouses,id',
            'quantity' => 'required|numeric|min:0.001',
            'reason' => 'required|in:sale,production,waste,damaged,expired,transfer,other',
            'reference_number' => 'nullable|string|max:50',
            'notes' => 'nullable|string|max:500'
        ]);

        if ($validator->fails()) {
            return response()->json([
                'success' => false,
                'errors' => $validator->errors()
            ], 422);
        }

        DB::beginTransaction();
        try {
            // Check stock availability at specific warehouse
            $available = $this->stockService->getAvailableStock(
                $request->product_id,
                $request->warehouse_id
            );

            if ($available < $request->quantity) {
                return response()->json([
                    'success' => false,
                    'message' => "Insufficient stock. Available: {$available}"
                ], 400);
            }

            // Map reason to movement subtype
            $subtypeMap = [
                'sale' => 'SALE',
                'production' => 'USED_IN_PUJA',
                'waste' => 'WASTAGE',
                'damaged' => 'DAMAGED',
                'expired' => 'EXPIRED',
                'transfer' => 'TRANSFER_OUT',
                'other' => 'ADJUSTMENT'
            ];

            // Get product for cost calculation
            $product = Product::find($request->product_id);
            $unitCost = $product->average_cost ?? 0;

            // Create stock movement
            $movement = StockMovement::create([
                'product_id' => $request->product_id,
                'warehouse_id' => $request->warehouse_id,
                'movement_type' => 'OUT',
                'movement_subtype' => $subtypeMap[$request->reason],
                'quantity' => $request->quantity,
                'unit_cost' => $unitCost,
                'total_cost' => ($request->quantity * $unitCost),
                'reference_type' => strtoupper($request->reason),
                'reference_number' => $request->reference_number,
                'notes' => $request->notes,
                'created_by' => auth()->id(),
                'approval_status' => 'APPROVED',
                'approved_by' => auth()->id(),
                'approved_at' => now()
            ]);

            // Update stock balance
            $this->stockService->updateStockBalance(
                $request->product_id,
                $request->warehouse_id,
                $request->quantity,
                'OUT'
            );

            DB::commit();

            return response()->json([
                'success' => true,
                'message' => 'Stock removed successfully',
                'data' => $movement->load(['product', 'warehouse'])
            ]);
        } catch (\Exception $e) {
            DB::rollback();
            return response()->json([
                'success' => false,
                'message' => 'Failed to remove stock: ' . $e->getMessage()
            ], 500);
        }
    }

    /**
     * Stock transfer between warehouses
     */
    public function stockTransfer(Request $request)
    {
        $validator = Validator::make($request->all(), [
            'product_id' => 'required|exists:products,id',
            'from_warehouse_id' => 'required|exists:warehouses,id',
            'to_warehouse_id' => 'required|exists:warehouses,id|different:from_warehouse_id',
            'quantity' => 'required|numeric|min:0.001',
            'batch_number' => 'nullable|string|max:50',
            'expiry_date' => 'nullable|date',
            'notes' => 'nullable|string|max:500'
        ]);

        if ($validator->fails()) {
            return response()->json([
                'success' => false,
                'errors' => $validator->errors()
            ], 422);
        }

        DB::beginTransaction();
        try {
            // Check availability at source warehouse
            $available = $this->stockService->getAvailableStock(
                $request->product_id,
                $request->from_warehouse_id
            );

            if ($available < $request->quantity) {
                return response()->json([
                    'success' => false,
                    'message' => "Insufficient stock at source. Available: {$available}"
                ], 400);
            }

            $transferNumber = 'TRF-' . date('YmdHis');
            $product = Product::find($request->product_id);
            $unitCost = $product->average_cost ?? 0;

            // Create OUT movement from source
            $outMovement = StockMovement::create([
                'product_id' => $request->product_id,
                'warehouse_id' => $request->from_warehouse_id,
                'movement_type' => 'OUT',
                'movement_subtype' => 'TRANSFER_OUT',
                'quantity' => $request->quantity,
                'unit_cost' => $unitCost,
                'total_cost' => ($request->quantity * $unitCost),
                'batch_number' => $request->batch_number,
                'expiry_date' => $request->expiry_date,
                'reference_type' => 'TRANSFER',
                'reference_number' => $transferNumber,
                'notes' => "Transfer to " . $request->to_warehouse_id . ". " . $request->notes,
                'created_by' => auth()->id(),
                'approval_status' => 'APPROVED',
                'approved_by' => auth()->id(),
                'approved_at' => now()
            ]);

            // Create IN movement to destination
            $inMovement = StockMovement::create([
                'product_id' => $request->product_id,
                'warehouse_id' => $request->to_warehouse_id,
                'movement_type' => 'IN',
                'movement_subtype' => 'TRANSFER_IN',
                'quantity' => $request->quantity,
                'unit_cost' => $unitCost,
                'total_cost' => ($request->quantity * $unitCost),
                'batch_number' => $request->batch_number,
                'expiry_date' => $request->expiry_date,
                'reference_type' => 'TRANSFER',
                'reference_number' => $transferNumber,
                'notes' => "Transfer from " . $request->from_warehouse_id . ". " . $request->notes,
                'created_by' => auth()->id(),
                'approval_status' => 'APPROVED',
                'approved_by' => auth()->id(),
                'approved_at' => now()
            ]);

            // Update stock balances
            $this->stockService->updateStockBalance(
                $request->product_id,
                $request->from_warehouse_id,
                $request->quantity,
                'OUT'
            );

            $this->stockService->updateStockBalance(
                $request->product_id,
                $request->to_warehouse_id,
                $request->quantity,
                'IN'
            );

            DB::commit();

            return response()->json([
                'success' => true,
                'message' => 'Stock transferred successfully',
                'data' => [
                    'transfer_number' => $transferNumber,
                    'out_movement' => $outMovement,
                    'in_movement' => $inMovement
                ]
            ]);
        } catch (\Exception $e) {
            DB::rollback();
            return response()->json([
                'success' => false,
                'message' => 'Transfer failed: ' . $e->getMessage()
            ], 500);
        }
    }

    /**
     * Check stock availability
     */
    public function checkAvailability(Request $request)
    {
        $validator = Validator::make($request->all(), [
            'product_id' => 'required|exists:products,id',
            'warehouse_id' => 'required|exists:warehouses,id',
            'quantity' => 'required|numeric|min:0'
        ]);

        if ($validator->fails()) {
            return response()->json([
                'success' => false,
                'errors' => $validator->errors()
            ], 422);
        }

        $available = $this->stockService->getAvailableStock(
            $request->product_id,
            $request->warehouse_id
        );

        $product = Product::find($request->product_id);

        return response()->json([
            'success' => true,
            'data' => [
                'product' => $product->name,
                'available_stock' => $available,
                'requested_quantity' => $request->quantity,
                'is_sufficient' => $available >= $request->quantity,
                'shortage' => max(0, $request->quantity - $available)
            ]
        ]);
    }

    /**
     * Get recent stock movements
     */
    public function getRecentMovements(Request $request)
    {
        $limit = $request->get('limit', 20);
        $type = $request->get('type'); // IN, OUT, or null for all

        $query = StockMovement::with(['product', 'warehouse', 'creator'])
            ->orderBy('created_at', 'desc');

        if ($type) {
            $query->where('movement_type', $type);
        }

        $movements = $query->limit($limit)->get();

        return response()->json([
            'success' => true,
            'data' => $movements
        ]);
    }
    public function processStockIn(Request $request)
    {
        $validator = Validator::make($request->all(), [
            'product_id' => 'required|exists:products,id',
            'warehouse_id' => 'required|exists:warehouses,id',
            'quantity' => 'required|numeric|min:0.001',
            'uom_id' => 'required|exists:uoms,id', // Added UOM validation
            'unit_cost' => 'nullable|numeric|min:0',
            'batch_number' => 'nullable|string|max:50',
            'expiry_date' => 'nullable|date|after:today',
            'notes' => 'nullable|string|max:500',
            'movement_subtype' => 'required|in:PURCHASE,DONATION_RECEIVED,ADJUSTMENT,OPENING_STOCK'
        ]);

        if ($validator->fails()) {
            return response()->json([
                'success' => false,
                'message' => $validator->errors()->first()
            ], 422);
        }

        DB::beginTransaction();
        try {
            $product = Product::with('uom')->find($request->product_id);
            $inputUomId = $request->uom_id; // Get the UOM from frontend

            // Validate UOM compatibility
            if ($inputUomId != $product->uom_id) {
                if (!$this->stockService->validateUomCompatibility($request->product_id, $inputUomId)) {
                    return response()->json([
                        'success' => false,
                        'message' => 'Selected UOM is not compatible with product UOM'
                    ], 422);
                }
            }

            // Check opening stock
            if ($request->movement_subtype === 'OPENING_STOCK') {
                $exists = StockMovement::where('product_id', $request->product_id)
                    ->where('warehouse_id', $request->warehouse_id)
                    ->where('movement_subtype', 'OPENING_STOCK')
                    ->where('approval_status', 'APPROVED')
                    ->exists();

                if ($exists) {
                    $warehouse = Warehouse::find($request->warehouse_id);
                    return response()->json([
                        'success' => false,
                        'message' => "Opening stock already set for {$product->name} in {$warehouse->name}.",
                        'error_type' => 'OPENING_STOCK_EXISTS'
                    ], 422);
                }
            }

            // Convert to product UOM if different
            $quantityInProductUom = $request->quantity;
            if ($inputUomId != $product->uom_id) {
                $quantityInProductUom = $this->stockService->convertBetweenUoms(
                    $request->quantity,
                    $inputUomId,
                    $product->uom_id
                );
            }

            // Convert to base units for storage
            $quantityInBaseUnits = $this->stockService->convertToBaseUnit(
                $quantityInProductUom,
                $product->uom_id
            );

            // If unit cost is provided, convert it to base unit cost
            $unitCostInBaseUnits = $request->unit_cost ?? 0;
            /* if ($unitCostInBaseUnits > 0 && $inputUomId != $product->uom_id) {
                // Convert cost per input UOM to cost per base unit
                $inputUom = Uom::find($inputUomId);
                // $conversionFactor = $inputUom->conversion_factor ?? 1;
                $conversionFactor = $quantityInProductUom/$quantityInBaseUnits;
                $unitCostInBaseUnits = $unitCostInBaseUnits / $conversionFactor;
            } */
			$conversionFactor = $quantityInProductUom/$quantityInBaseUnits;
            $unitCostInBaseUnits = $unitCostInBaseUnits * $conversionFactor;
            // Create movement
            $movement = StockMovement::create([
                'movement_number' => $this->generateMovementNumber('IN'),
                'product_id' => $request->product_id,
                'warehouse_id' => $request->warehouse_id,
                'movement_type' => 'IN',
                'movement_subtype' => $request->movement_subtype,
                'quantity' => $quantityInBaseUnits,
                'input_uom_id' => $inputUomId,
                'unit_cost' => $unitCostInBaseUnits,
                'total_cost' => ($quantityInBaseUnits * $unitCostInBaseUnits),
                'batch_number' => $request->batch_number,
                'expiry_date' => $request->expiry_date,
                'reference_type' => 'DIRECT',
                'notes' => $request->notes,
                'created_by' => auth()->id(),
                'approval_status' => 'APPROVED',
                'approved_by' => auth()->id(),
                'approved_at' => now()
            ]);

            // Update stock balance
            $this->stockService->updateStockBalance(
                $request->product_id,
                $request->warehouse_id,
                $request->quantity,
                'IN',
                $inputUomId
            );

            // Update average cost
            if ($unitCostInBaseUnits > 0) {
                $this->stockService->updateAverageCost(
                    $request->product_id,
                    $unitCostInBaseUnits,
                    $quantityInBaseUnits
                );
            }

            DB::commit();

            $stockInfo = $this->stockService->getStockInfo($request->product_id, $request->warehouse_id);

            return response()->json([
                'success' => true,
                'message' => 'Stock added successfully',
                'data' => [
                    'movement' => $movement->load(['product.uom', 'warehouse']),
                    'stock_info' => $stockInfo
                ]
            ]);
        } catch (\Exception $e) {
            DB::rollback();
            return response()->json([
                'success' => false,
                'message' => 'Failed to add stock: ' . $e->getMessage()
            ], 500);
        }
    }







    public function getRecentStockIn(Request $request)
    {
        $limit = $request->get('limit', 20);

        $movements = StockMovement::with([
            'product.uom.baseUnit',           // Load product with UOM
            'warehouse',
            'creator'
        ])
            ->where('movement_type', 'IN')
            ->whereIn('movement_subtype', ['OPENING_STOCK', 'PURCHASE', 'DONATION_RECEIVED', 'ADJUSTMENT'])
            ->orderBy('created_at', 'desc')
            ->limit($limit)
            ->get()
            ->map(function ($movement) {
                // Get the UOM information
                $uom = $movement->product->uom;
				// FIXED: Use baseUnit (relationship) instead of base_unit (ID)
				$uomShort = $uom && $uom->baseUnit 
					? $uom->baseUnit->uom_short 
					: ($uom ? $uom->uom_short : '');
				
				// For UOM name, use base unit name if available
				$uomName = $uom && $uom->baseUnit 
					? $uom->baseUnit->name 
					: ($uom ? $uom->name : '');
				
				return [
					'movement_date' => $movement->created_at,
					'item_name' => $movement->product->name,
					'item_type' => $movement->product->product_type,
					'item_code' => $movement->product->code,
					'location_name' => $movement->warehouse->name,
					'quantity' => $movement->quantity,
					'uom_short' => $uomShort,
					'uom_name' => $uomName,
					'unit_cost' => $movement->unit_cost,
					'total_cost' => $movement->total_cost,
					'batch_number' => $movement->batch_number,
					'expiry_date' => $movement->expiry_date,
					'notes' => $movement->notes,
					'created_by' => optional($movement->creator)->name
				];
            });

        return response()->json([
            'success' => true,
            'data' => $movements
        ]);
    }















    public function getItemStockInfo(Request $request)
    {
        try {
            $productId = $request->product_id;
            $warehouseId = $request->warehouse_id;

            if (!$productId || !$warehouseId) {
                return response()->json([
                    'success' => false,
                    'message' => 'Product ID and Warehouse ID are required'
                ], 400);
            }

            $product = Product::with('uom')->find($productId);
            if (!$product) {
                return response()->json([
                    'success' => false,
                    'message' => 'Product not found'
                ], 404);
            }

            // Get current stock at this specific warehouse
            $currentStock = $this->stockService->getAvailableStock($productId, $warehouseId);

            return response()->json([
                'success' => true,
                'data' => [
                    'item_name' => $product->name,
                    'item_code' => $product->code,
                    'current_stock' => $currentStock,
                    'unit' => optional($product->uom)->name ?? '',
                    'avg_cost' => $product->average_cost ?? 0,
                    'min_stock_level' => $product->min_stock_level ?? 0,
                    'max_stock_level' => $product->max_stock_level ?? 0
                ]
            ]);
        } catch (\Exception $e) {
            \Log::error('Error in getItemStockInfo: ' . $e->getMessage());
            return response()->json([
                'success' => false,
                'message' => 'An error occurred: ' . $e->getMessage()
            ], 500);
        }
    }

    /**
     * Generate unique movement number
     */
    private function generateMovementNumber($type)
    {
        $prefix = $type === 'IN' ? 'STK-IN' : 'STK-OUT';
        $date = date('Ymd');
        $lastMovement = StockMovement::where('movement_number', 'like', $prefix . '-' . $date . '%')
            ->orderBy('movement_number', 'desc')
            ->first();

        if ($lastMovement) {
            $lastNumber = intval(substr($lastMovement->movement_number, -4));
            $newNumber = str_pad($lastNumber + 1, 4, '0', STR_PAD_LEFT);
        } else {
            $newNumber = '0001';
        }

        return $prefix . '-' . $date . '-' . $newNumber;
    }



    public function processStockOut(Request $request)
    {
        $validator = Validator::make($request->all(), [
            'product_id' => 'required|exists:products,id',
            'warehouse_id' => 'required|exists:warehouses,id',
            'quantity' => 'required|numeric|min:0.0001',
            'uom_id' => 'nullable|exists:uoms,id',  // Added UOM validation
            'reason' => 'required|in:sale,production,waste,damaged,expired,transfer,other',
            'reference_number' => 'nullable|string|max:50',
            'notes' => 'nullable|string|max:500'
        ]);
        if ($validator->fails()) {
            return response()->json([
                'success' => false,
                'message' => $validator->errors()->first()
            ], 422);
        }

        DB::beginTransaction();
        try {
            $product = Product::with('uom')->find($request->product_id);
            $inputUomId = $request->uom_id;
            if (!$inputUomId) {
                $product = Product::with('uom')->find($request->product_id);
                $inputUomId = $product->uom_id;
            } else {
                      $inputUomId = $request->uom_id;
            }
            // Validate UOM compatibility
            if ($inputUomId != $product->uom_id) {
                if (!$this->stockService->validateUomCompatibility($request->product_id, $inputUomId)) {
                    return response()->json([
                        'success' => false,
                        'message' => 'Selected UOM is not compatible with product UOM'
                    ], 422);
                }
            }
		
            // Convert to product UOM if different
            $quantityInProductUom = $request->quantity;
            if ($inputUomId != $product->uom_id) {
                $quantityInProductUom = $this->stockService->convertBetweenUoms(
                    $request->quantity,
                    $inputUomId,
                    $product->uom_id
                );
            }
			
            // Convert to base units for storage
            $quantityInBaseUnits = $this->stockService->convertToBaseUnit(
                $quantityInProductUom,
                $product->uom_id
            );

            // Check stock availability at specific warehouse
            $availableStock = $this->stockService->getAvailableStock(
                $request->product_id,
                $request->warehouse_id
            );
			
            if ($availableStock < $quantityInBaseUnits) {
                // Convert available stock to input UOM for error message
                $availableInInputUom = $availableStock;
                if ($inputUomId != $product->uom_id) {
                    $availableInInputUom = $this->stockService->convertBetweenUoms(
                        $this->stockService->convertFromBaseUnit($availableStock, $product->uom_id),
                        $product->uom_id,
                        $inputUomId
                    );
                } else {
                    $availableInInputUom = $this->stockService->convertFromBaseUnit($availableStock, $product->uom_id);
                }

                $inputUom = Uom::find($inputUomId);
                return response()->json([
                    'success' => false,
                    'message' => "Insufficient stock. Available: " . round($availableInInputUom, 3) . " " . $inputUom->uom_short,
                    'available_stock' => $availableInInputUom
                ], 400);
            }

            // Get product for cost calculation
            $unitCost = $product->average_cost ?? 0;

            // Map reason to movement subtype
            $subtypeMap = [
                'sale' => 'SALE',
                'production' => 'USED_IN_PUJA',
                'waste' => 'WASTAGE',
                'damaged' => 'DAMAGED',
                'expired' => 'EXPIRED',
                'transfer' => 'TRANSFER_OUT',
                'other' => 'ADJUSTMENT'
            ];

            // Generate reference number if not provided
            $referenceNumber = $request->reference_number ?: 'OUT-' . date('YmdHis');

            // Create stock movement record
            $movement = StockMovement::create([
                'movement_number' => $this->generateMovementNumber('OUT'),
                'product_id' => $request->product_id,
                'warehouse_id' => $request->warehouse_id,
                'movement_type' => 'OUT',
                'movement_subtype' => $subtypeMap[$request->reason],
                'quantity' => $quantityInBaseUnits,
                'input_uom_id' => $inputUomId,  // Store the UOM used for input
                'unit_cost' => $unitCost,
                'total_cost' => ($quantityInBaseUnits * $unitCost),
                'reference_type' => strtoupper($request->reason),
                'reference_id' => $referenceNumber,
                'notes' => $request->notes,
                'created_by' => auth()->id(),
                'approval_status' => 'APPROVED',
                'approved_by' => auth()->id(),
                'approved_at' => now()
            ]);

            // Update stock balance (in base units)
            $this->stockService->updateStockBalance(
                $request->product_id,
                $request->warehouse_id,
                $request->quantity,
                'OUT',
                $inputUomId
            );

            // Get updated balance
            $newBalance = $this->stockService->getAvailableStock(
                $request->product_id,
                $request->warehouse_id
            );

            // Check if stock goes below minimum level
            $belowMinimum = false;
            if ($product->min_stock && $newBalance < $product->min_stock) {
                $belowMinimum = true;
                // You can trigger low stock alert here
                // event(new LowStockAlert($product, $newBalance));
            }

            // Convert quantities to input UOM for response
            $previousStockInInputUom = $availableStock;
            $newBalanceInInputUom = $newBalance;

            if ($inputUomId != $product->uom_id) {
                $previousStockInInputUom = $this->stockService->convertBetweenUoms(
                    $this->stockService->convertFromBaseUnit($availableStock, $product->uom_id),
                    $product->uom_id,
                    $inputUomId
                );
                $newBalanceInInputUom = $this->stockService->convertBetweenUoms(
                    $this->stockService->convertFromBaseUnit($newBalance, $product->uom_id),
                    $product->uom_id,
                    $inputUomId
                );
            } else {
                $previousStockInInputUom = $this->stockService->convertFromBaseUnit($availableStock, $product->uom_id);
                $newBalanceInInputUom = $this->stockService->convertFromBaseUnit($newBalance, $product->uom_id);
            }

            DB::commit();

            return response()->json([
                'success' => true,
                'message' => 'Stock out processed successfully',
                'data' => [
                    'movement' => $movement->load(['product', 'warehouse']),
                    'previous_stock' => $previousStockInInputUom,
                    'quantity_out' => $request->quantity,
                    'remaining_stock' => $newBalanceInInputUom,
                    'below_minimum' => $belowMinimum
                ]
            ]);
        } catch (\Exception $e) {
            DB::rollback();
            Log::error('Stock out failed: ' . $e->getMessage(), [
                'product_id' => $request->product_id,
                'warehouse_id' => $request->warehouse_id,
                'quantity' => $request->quantity,
                'uom_id' => $request->uom_id
            ]);

            return response()->json([
                'success' => false,
                'message' => 'Failed to process stock out: ' . $e->getMessage()
            ], 500);
        }
    }
    // Add this helper method to check stock at location
    public function checkStockAtLocation(Request $request)
    {

        $validator = Validator::make($request->all(), [
            'product_id' => 'required|exists:products,id',
            'warehouse_id' => 'required|exists:warehouses,id'
        ]);

        if ($validator->fails()) {
            return response()->json([
                'success' => false,
                'message' => $validator->errors()->first()
            ], 422);
        }

        $product = Product::with('uom')->find($request->product_id);

        $availableStock = $this->stockService->getAvailableStock(
            $request->product_id,
            $request->warehouse_id
        );

        return response()->json([
            'success' => true,
            'data' => [
                'product_name' => $product->name,
                'product_code' => $product->code,
                'current_stock' => $availableStock,
                'unit' => $product->uom->name ?? '',
                'min_stock_level' => $product->min_stock_level,
                'location_stock' => $availableStock
            ]
        ]);
    }
    public function processStockTransfer(Request $request)
    {
        $validator = Validator::make($request->all(), [
            'product_id' => 'required|exists:products,id',
            'from_warehouse_id' => 'required|exists:warehouses,id',
            'to_warehouse_id' => 'required|exists:warehouses,id|different:from_warehouse_id',
            'quantity' => 'required|numeric|min:0.001',
            'batch_number' => 'nullable|string|max:50',
            'expiry_date' => 'nullable|date|after:today',
            'transfer_reason' => 'required|string|max:100',
            'notes' => 'nullable|string|max:500'
        ]);

        if ($validator->fails()) {
            return response()->json([
                'success' => false,
                'message' => $validator->errors()->first(),
                'errors' => $validator->errors()
            ], 422);
        }

        DB::beginTransaction();
        try {
            // Check stock availability at source warehouse
            $availableStock = $this->stockService->getAvailableStock(
                $request->product_id,
                $request->from_warehouse_id
            );

            if ($availableStock < $request->quantity) {
                return response()->json([
                    'success' => false,
                    'message' => "Insufficient stock at source warehouse. Available: {$availableStock}",
                    'available_stock' => $availableStock,
                    'requested_quantity' => $request->quantity
                ], 400);
            }

            // Get product and warehouse details
            $product = Product::find($request->product_id);
            $fromWarehouse = Warehouse::find($request->from_warehouse_id);
            $toWarehouse = Warehouse::find($request->to_warehouse_id);
            $unitCost = $product->average_cost ?? 0;
            $totalCost = $request->quantity * $unitCost;

            // Generate transfer number
            $transferNumber = $this->generateTransferNumber();

            // Create OUT movement from source warehouse
            $outMovement = StockMovement::create([
                'movement_number' => $transferNumber . '-OUT',
                'product_id' => $request->product_id,
                'warehouse_id' => $request->from_warehouse_id,
                'movement_type' => 'OUT',
                'movement_subtype' => 'TRANSFER_OUT',
                'quantity' => $request->quantity,
                'unit_cost' => $unitCost,
                'total_cost' => $totalCost,
                'batch_number' => $request->batch_number,
                'expiry_date' => $request->expiry_date,
                'reference_type' => 'TRANSFER',
                'reference_id' => $transferNumber,
                'notes' => "Transfer to {$toWarehouse->name}. Reason: {$request->transfer_reason}. " . $request->notes,
                'created_by' => auth()->id(),
                'approval_status' => 'APPROVED',
                'approved_by' => auth()->id(),
                'approved_at' => now()
            ]);

            // Create IN movement to destination warehouse
            $inMovement = StockMovement::create([
                'movement_number' => $transferNumber . '-IN',
                'product_id' => $request->product_id,
                'warehouse_id' => $request->to_warehouse_id,
                'movement_type' => 'IN',
                'movement_subtype' => 'TRANSFER_IN',
                'quantity' => $request->quantity,
                'unit_cost' => $unitCost,
                'total_cost' => $totalCost,
                'batch_number' => $request->batch_number,
                'expiry_date' => $request->expiry_date,
                'reference_type' => 'TRANSFER',
                'reference_id' => $transferNumber,
                'notes' => "Transfer from {$fromWarehouse->name}. Reason: {$request->transfer_reason}. " . $request->notes,
                'created_by' => auth()->id(),
                'approval_status' => 'APPROVED',
                'approved_by' => auth()->id(),
                'approved_at' => now()
            ]);

            // Update stock balances
            $this->stockService->updateStockBalance(
                $request->product_id,
                $request->from_warehouse_id,
                $request->quantity,
                'OUT'
            );

            $this->stockService->updateStockBalance(
                $request->product_id,
                $request->to_warehouse_id,
                $request->quantity,
                'IN'
            );

            // Get updated stock levels
            $newSourceStock = $this->stockService->getAvailableStock(
                $request->product_id,
                $request->from_warehouse_id
            );

            $newDestStock = $this->stockService->getAvailableStock(
                $request->product_id,
                $request->to_warehouse_id
            );

            DB::commit();

            return response()->json([
                'success' => true,
                'message' => 'Stock transferred successfully',
                'data' => [
                    'transfer_number' => $transferNumber,
                    'product' => [
                        'name' => $product->name,
                        'code' => $product->code
                    ],
                    'from_warehouse' => [
                        'name' => $fromWarehouse->name,
                        'previous_stock' => $availableStock,
                        'current_stock' => $newSourceStock
                    ],
                    'to_warehouse' => [
                        'name' => $toWarehouse->name,
                        'previous_stock' => $newDestStock - $request->quantity,
                        'current_stock' => $newDestStock
                    ],
                    'quantity_transferred' => $request->quantity,
                    'unit_cost' => $unitCost,
                    'total_value' => $totalCost,
                    'out_movement' => $outMovement,
                    'in_movement' => $inMovement
                ]
            ]);
        } catch (\Exception $e) {
            DB::rollback();
            return response()->json([
                'success' => false,
                'message' => 'Transfer failed: ' . $e->getMessage()
            ], 500);
        }
    }
    private function generateTransferNumber()
    {
        $prefix = 'TRF';
        $date = date('Ymd');

        $lastTransfer = StockMovement::where('reference_id', 'like', $prefix . '-' . $date . '%')
            ->where('reference_type', 'TRANSFER')
            ->orderBy('reference_id', 'desc')
            ->first();

        if ($lastTransfer) {
            $lastNumber = intval(substr($lastTransfer->reference_id, -4));
            $newNumber = str_pad($lastNumber + 1, 4, '0', STR_PAD_LEFT);
        } else {
            $newNumber = '0001';
        }

        return $prefix . '-' . $date . '-' . $newNumber;
    }
    public function checkTransferFeasibility(Request $request)
    {
        $validator = Validator::make($request->all(), [
            'product_id' => 'required|exists:products,id',
            'from_warehouse_id' => 'required|exists:warehouses,id',
            'quantity' => 'required|numeric|min:0.001'
        ]);

        if ($validator->fails()) {
            return response()->json([
                'success' => false,
                'message' => $validator->errors()->first()
            ], 422);
        }

        $product = Product::with('uom')->find($request->product_id);
        $fromWarehouse = Warehouse::find($request->from_warehouse_id);
        $availableStock = $this->stockService->getAvailableStock(
            $request->product_id,
            $request->from_warehouse_id
        );

        $canTransfer = $availableStock >= $request->quantity;

        return response()->json([
            'success' => true,
            'data' => [
                'can_transfer' => $canTransfer,
                'product_name' => $product->name,
                'warehouse_name' => $fromWarehouse->name,
                'available_stock' => $availableStock,
                'requested_quantity' => $request->quantity,
                'shortage' => $canTransfer ? 0 : ($request->quantity - $availableStock),
                'unit' => $product->uom->name ?? ''
            ]
        ]);
    }
    public function show($id)
    {
        try {
            $movement = StockMovement::with(['product', 'product.uom.baseUnit', 'warehouse', 'creator'])
                ->findOrFail($id);

            return response()->json([
                'success' => true,
                'data' => $movement
            ]);
        } catch (\Exception $e) {
            return response()->json([
                'success' => false,
                'message' => 'Stock movement not found'
            ], 404);
        }
    }


    /**
     * Process bulk stock in
     */
    public function bulkStockIn(Request $request)
    {
        $validator = Validator::make($request->all(), [
            'warehouse_id' => 'required|exists:warehouses,id',
            'movement_subtype' => 'required|in:OPENING_STOCK,PURCHASE,DONATION_RECEIVED,ADJUSTMENT',
            'reference_number' => 'required|string|max:50',
            'items' => 'required|array|min:1',
            'items.*.product_id' => 'required|exists:products,id',
            'items.*.quantity' => 'required|numeric|min:0.001',
            'items.*.unit_cost' => 'nullable|numeric|min:0',
            'items.*.batch_number' => 'nullable|string|max:50',
            'items.*.expiry_date' => 'nullable|date|after:today',
            'items.*.notes' => 'nullable|string|max:500',
            'is_draft' => 'boolean'
        ]);

        if ($validator->fails()) {
            return response()->json([
                'success' => false,
                'message' => $validator->errors()->first(),
                'errors' => $validator->errors()
            ], 422);
        }

        // Check for duplicate products in the request
        $productIds = array_column($request->items, 'product_id');
        if (count($productIds) !== count(array_unique($productIds))) {
            return response()->json([
                'success' => false,
                'message' => 'Duplicate products found in the request. Each product can only appear once.'
            ], 422);
        }

        DB::beginTransaction();
        try {
            $warehouseId = $request->warehouse_id;
            $movementSubtype = $request->movement_subtype;
            $referenceNumber = $request->reference_number;
            $isDraft = $request->is_draft ?? false;

            // If opening stock, validate that none of the products already have opening stock
            if ($movementSubtype === 'OPENING_STOCK' && !$isDraft) {
                foreach ($request->items as $item) {
                    $existingOpeningStock = StockMovement::where('product_id', $item['product_id'])
                        ->where('warehouse_id', $warehouseId)
                        ->where('movement_subtype', 'OPENING_STOCK')
                        ->where('approval_status', 'APPROVED')
                        ->exists();

                    if ($existingOpeningStock) {
                        $product = Product::find($item['product_id']);
                        $warehouse = Warehouse::find($warehouseId);

                        return response()->json([
                            'success' => false,
                            'message' => "Opening stock already exists for {$product->name} in {$warehouse->name}",
                            'error_type' => 'OPENING_STOCK_EXISTS',
                            'product_id' => $item['product_id']
                        ], 422);
                    }
                }
            }

            $processedItems = [];
            $totalValue = 0;

            foreach ($request->items as $item) {
                // Generate individual movement number for each item
                $itemMovementNumber = $this->generateMovementNumber('IN');

                // Create stock movement record
                $movement = StockMovement::create([
                    'movement_number' => $itemMovementNumber,
                    'product_id' => $item['product_id'],
                    'warehouse_id' => $warehouseId,
                    'movement_type' => 'IN',
                    'movement_subtype' => $movementSubtype,
                    'quantity' => $item['quantity'],
                    'unit_cost' => $item['unit_cost'] ?? 0,
                    'total_cost' => ($item['quantity'] * ($item['unit_cost'] ?? 0)),
                    'batch_number' => $item['batch_number'] ?? null,
                    'expiry_date' => $item['expiry_date'] ?? null,
                    'reference_type' => 'BULK',
                    'reference_id' => $referenceNumber,  // Common reference for all items
                    'notes' => $item['notes'] ?? null,
                    'created_by' => auth()->id(),
                    'approval_status' => $isDraft ? 'DRAFT' : 'APPROVED',
                    'approved_by' => $isDraft ? null : auth()->id(),
                    'approved_at' => $isDraft ? null : now()
                ]);

                // Only update stock balance if not a draft
                if (!$isDraft) {
                    $this->stockService->updateStockBalance(
                        $item['product_id'],
                        $warehouseId,
                        $item['quantity'],
                        'IN'
                    );

                    // Update product average cost if unit cost provided
                    if (isset($item['unit_cost']) && $item['unit_cost'] > 0) {
                        $this->stockService->updateAverageCost(
                            $item['product_id'],
                            $item['unit_cost'],
                            $item['quantity']
                        );
                    }
                }

                $totalValue += $movement->total_cost;
                $processedItems[] = $movement->load(['product', 'warehouse']);
            }

            // Log the bulk operation
            Log::info('Bulk stock in processed', [
                'user_id' => auth()->id(),
                'reference_number' => $referenceNumber,
                'warehouse_id' => $warehouseId,
                'movement_subtype' => $movementSubtype,
                'total_items' => count($processedItems),
                'total_value' => $totalValue,
                'is_draft' => $isDraft
            ]);

            DB::commit();

            return response()->json([
                'success' => true,
                'message' => $isDraft
                    ? 'Bulk stock in saved as draft successfully'
                    : 'Bulk stock in processed successfully',
                'data' => [
                    'reference_number' => $referenceNumber,
                    'warehouse_id' => $warehouseId,
                    'movement_subtype' => $movementSubtype,
                    'total_items' => count($processedItems),
                    'total_value' => $totalValue,
                    'items' => $processedItems,
                    'is_draft' => $isDraft
                ]
            ]);
        } catch (\Exception $e) {
            DB::rollback();
            Log::error('Bulk stock in failed', [
                'error' => $e->getMessage(),
                'trace' => $e->getTraceAsString()
            ]);

            return response()->json([
                'success' => false,
                'message' => 'Failed to process bulk stock in: ' . $e->getMessage()
            ], 500);
        }
    }

    /**
     * Get bulk stock in by reference number (for editing)
     */
    public function getBulkStockIn($referenceNumber)
    {
        try {
            $movements = StockMovement::with(['product', 'warehouse', 'creator'])
                ->where('reference_id', $referenceNumber)
                ->where('reference_type', 'BULK')
                ->get();

            if ($movements->isEmpty()) {
                return response()->json([
                    'success' => false,
                    'message' => 'Bulk stock in record not found'
                ], 404);
            }

            // Get common data from first movement
            $firstMovement = $movements->first();
            $warehouse = $firstMovement->warehouse;
            $movementSubtype = $firstMovement->movement_subtype;

            // Format items for frontend
            $items = $movements->map(function ($movement) {
                return [
                    'product_id' => $movement->product_id,
                    'product_name' => $movement->product->name,
                    'product_code' => $movement->product->product_code,
                    'quantity' => $movement->quantity,
                    'unit_cost' => $movement->unit_cost,
                    'batch_number' => $movement->batch_number,
                    'expiry_date' => $movement->expiry_date,
                    'notes' => $movement->notes,
                    'uom' => optional($movement->product->uom)->name,
                    'total_cost' => $movement->total_cost,
                    'movement_number' => $movement->movement_number,
                    'created_at' => $movement->created_at,
                    'approval_status' => $movement->approval_status
                ];
            });

            return response()->json([
                'success' => true,
                'data' => [
                    'reference_number' => $referenceNumber,
                    'warehouse_id' => $warehouse->id,
                    'warehouse_name' => $warehouse->name,
                    'movement_subtype' => $movementSubtype,
                    'items' => $items,
                    'created_by' => optional($firstMovement->creator)->name,
                    'created_at' => $firstMovement->created_at,
                    'approval_status' => $firstMovement->approval_status,
                    'can_edit' => $firstMovement->approval_status === 'DRAFT'
                ]
            ]);
        } catch (\Exception $e) {
            return response()->json([
                'success' => false,
                'message' => 'Error retrieving bulk stock in: ' . $e->getMessage()
            ], 500);
        }
    }

    /**
     * Update bulk stock in (for drafts only)
     */
    public function updateBulkStockIn(Request $request, $referenceNumber)
    {
        $validator = Validator::make($request->all(), [
            'items' => 'required|array|min:1',
            'items.*.product_id' => 'required|exists:products,id',
            'items.*.quantity' => 'required|numeric|min:0.001',
            'items.*.unit_cost' => 'nullable|numeric|min:0',
            'items.*.batch_number' => 'nullable|string|max:50',
            'items.*.expiry_date' => 'nullable|date|after:today',
            'items.*.notes' => 'nullable|string|max:500',
            'submit_for_approval' => 'boolean'
        ]);

        if ($validator->fails()) {
            return response()->json([
                'success' => false,
                'message' => $validator->errors()->first()
            ], 422);
        }

        DB::beginTransaction();
        try {
            // Check if bulk stock in exists and is still draft
            $existingMovements = StockMovement::where('reference_id', $referenceNumber)
                ->where('reference_type', 'BULK')
                ->get();

            if ($existingMovements->isEmpty()) {
                return response()->json([
                    'success' => false,
                    'message' => 'Bulk stock in record not found'
                ], 404);
            }

            $firstMovement = $existingMovements->first();

            if ($firstMovement->approval_status !== 'DRAFT') {
                return response()->json([
                    'success' => false,
                    'message' => 'Only draft bulk stock in can be edited'
                ], 400);
            }

            // Delete existing movements
            StockMovement::where('reference_id', $referenceNumber)
                ->where('reference_type', 'BULK')
                ->delete();

            // Re-create with updated data
            $warehouseId = $firstMovement->warehouse_id; // Keep original warehouse
            $movementSubtype = $firstMovement->movement_subtype;
            $submitForApproval = $request->submit_for_approval ?? false;

            foreach ($request->items as $item) {
                $itemMovementNumber = $this->generateMovementNumber('IN');

                $movement = StockMovement::create([
                    'movement_number' => $itemMovementNumber,
                    'product_id' => $item['product_id'],
                    'warehouse_id' => $warehouseId,
                    'movement_type' => 'IN',
                    'movement_subtype' => $movementSubtype,
                    'quantity' => $item['quantity'],
                    'unit_cost' => $item['unit_cost'] ?? 0,
                    'total_cost' => ($item['quantity'] * ($item['unit_cost'] ?? 0)),
                    'batch_number' => $item['batch_number'] ?? null,
                    'expiry_date' => $item['expiry_date'] ?? null,
                    'reference_type' => 'BULK',
                    'reference_id' => $referenceNumber,
                    'notes' => $item['notes'] ?? null,
                    'created_by' => auth()->id(),
                    'approval_status' => $submitForApproval ? 'APPROVED' : 'DRAFT',
                    'approved_by' => $submitForApproval ? auth()->id() : null,
                    'approved_at' => $submitForApproval ? now() : null
                ]);

                // Update stock if submitting for approval
                if ($submitForApproval) {
                    $this->stockService->updateStockBalance(
                        $item['product_id'],
                        $warehouseId,
                        $item['quantity'],
                        'IN'
                    );

                    if (isset($item['unit_cost']) && $item['unit_cost'] > 0) {
                        $this->stockService->updateAverageCost(
                            $item['product_id'],
                            $item['unit_cost'],
                            $item['quantity']
                        );
                    }
                }
            }

            DB::commit();

            return response()->json([
                'success' => true,
                'message' => $submitForApproval
                    ? 'Bulk stock in updated and approved successfully'
                    : 'Bulk stock in draft updated successfully'
            ]);
        } catch (\Exception $e) {
            DB::rollback();
            return response()->json([
                'success' => false,
                'message' => 'Failed to update bulk stock in: ' . $e->getMessage()
            ], 500);
        }
    }

    /**
     * Delete bulk stock in (drafts only)
     */
    public function deleteBulkStockIn($referenceNumber)
    {
        DB::beginTransaction();
        try {
            $movements = StockMovement::where('reference_id', $referenceNumber)
                ->where('reference_type', 'BULK')
                ->get();

            if ($movements->isEmpty()) {
                return response()->json([
                    'success' => false,
                    'message' => 'Bulk stock in record not found'
                ], 404);
            }

            if ($movements->first()->approval_status !== 'DRAFT') {
                return response()->json([
                    'success' => false,
                    'message' => 'Only draft bulk stock in can be deleted'
                ], 400);
            }

            StockMovement::where('reference_id', $referenceNumber)
                ->where('reference_type', 'BULK')
                ->delete();

            DB::commit();

            return response()->json([
                'success' => true,
                'message' => 'Bulk stock in deleted successfully'
            ]);
        } catch (\Exception $e) {
            DB::rollback();
            return response()->json([
                'success' => false,
                'message' => 'Failed to delete bulk stock in: ' . $e->getMessage()
            ], 500);
        }
    }

    /**
     * Validate if opening stock exists for products
     */
    public function validateOpeningStock(Request $request)
    {
        $validator = Validator::make($request->all(), [
            'product_id' => 'required|exists:products,id',
            'warehouse_id' => 'required|exists:warehouses,id'
        ]);

        if ($validator->fails()) {
            return response()->json([
                'success' => false,
                'message' => $validator->errors()->first()
            ], 422);
        }

        $exists = StockMovement::where('product_id', $request->product_id)
            ->where('warehouse_id', $request->warehouse_id)
            ->where('movement_subtype', 'OPENING_STOCK')
            ->where('approval_status', 'APPROVED')
            ->exists();

        return response()->json([
            'success' => true,
            'has_opening_stock' => $exists
        ]);
    }

    /**
     * Get list of bulk stock-in records with pagination
     */
    public function getBulkStockInList(Request $request)
    {
        try {
            // Get unique bulk stock-in records by reference number
            $query = StockMovement::select(
                'reference_id',
                'warehouse_id',
                'movement_subtype',
                'approval_status',
                'created_by',
                'created_at',
                DB::raw('COUNT(*) as item_count'),
                DB::raw('SUM(quantity) as total_quantity'),
                DB::raw('SUM(total_cost) as total_value')
            )
                ->where('reference_type', 'BULK')
                ->where('movement_type', 'IN')
                ->with(['warehouse', 'creator'])
                ->groupBy('reference_id', 'warehouse_id', 'movement_subtype', 'approval_status', 'created_by', 'created_at');

            // Apply filters
            if ($request->has('warehouse_id')) {
                $query->where('warehouse_id', $request->warehouse_id);
            }

            if ($request->has('movement_subtype')) {
                $query->where('movement_subtype', $request->movement_subtype);
            }

            if ($request->has('approval_status')) {
                $query->where('approval_status', $request->approval_status);
            }

            if ($request->has('from_date')) {
                $query->whereDate('created_at', '>=', $request->from_date);
            }

            if ($request->has('to_date')) {
                $query->whereDate('created_at', '<=', $request->to_date);
            }

            if ($request->has('search')) {
                $search = $request->search;
                $query->where('reference_id', 'like', "%{$search}%");
            }

            // Order by created_at desc
            $query->orderBy('created_at', 'desc');

            // Paginate
            $perPage = $request->get('per_page', 20);
            $results = $query->paginate($perPage);

            // Format the results
            $formattedResults = $results->map(function ($item) {
                return [
                    'reference_number' => $item->reference_id,
                    'warehouse' => [
                        'id' => $item->warehouse_id,
                        'name' => optional($item->warehouse)->name
                    ],
                    'movement_subtype' => $item->movement_subtype,
                    'movement_subtype_label' => $this->getMovementSubtypeLabel($item->movement_subtype),
                    'item_count' => $item->item_count,
                    'total_quantity' => $item->total_quantity,
                    'total_value' => $item->total_value,
                    'approval_status' => $item->approval_status,
                    'created_by' => optional($item->creator)->name,
                    'created_at' => $item->created_at->format('Y-m-d H:i:s'),
                    'can_edit' => $item->approval_status === 'DRAFT',
                    'can_delete' => $item->approval_status === 'DRAFT'
                ];
            });

            return response()->json([
                'success' => true,
                'data' => [
                    'items' => $formattedResults,
                    'pagination' => [
                        'total' => $results->total(),
                        'per_page' => $results->perPage(),
                        'current_page' => $results->currentPage(),
                        'last_page' => $results->lastPage(),
                        'from' => $results->firstItem(),
                        'to' => $results->lastItem()
                    ]
                ]
            ]);
        } catch (\Exception $e) {
            return response()->json([
                'success' => false,
                'message' => 'Error retrieving bulk stock-in list: ' . $e->getMessage()
            ], 500);
        }
    }

    /**
     * Helper method to get movement subtype label
     */
    private function getMovementSubtypeLabel($subtype)
    {
        $labels = [
            'OPENING_STOCK' => 'Opening Stock',
            'PURCHASE' => 'Purchase',
            'DONATION_RECEIVED' => 'Donation Received',
            'ADJUSTMENT' => 'Adjustment'
        ];

        return $labels[$subtype] ?? $subtype;
    }



    /**
     * Process bulk stock out
     */
    /**
     * Process bulk stock out
     */
    public function processBulkStockOut(Request $request)
    {
        $validator = Validator::make($request->all(), [
            'warehouse_id' => 'required|exists:warehouses,id',
            'reference_number' => 'nullable|string|max:50',
            'items' => 'required|array|min:1',
            'items.*.product_id' => 'required|exists:products,id',
            'items.*.quantity' => 'required|numeric|min:0.001',
            'items.*.reason' => 'required|in:sale,production,waste,damaged,expired,transfer,other',
            'items.*.notes' => 'nullable|string|max:500'
        ]);

        if ($validator->fails()) {
            return response()->json([
                'success' => false,
                'message' => $validator->errors()->first(),
                'errors' => $validator->errors()
            ], 422);
        }

        // Check for duplicate products in the request
        $productIds = array_column($request->items, 'product_id');
        if (count($productIds) !== count(array_unique($productIds))) {
            return response()->json([
                'success' => false,
                'message' => 'Duplicate products found in the request. Each product can only appear once.'
            ], 422);
        }

        DB::beginTransaction();
        try {
            $warehouseId = $request->warehouse_id;
            $referenceNumber = $request->reference_number ?: 'BULK-OUT-' . date('YmdHis');
            $processedItems = [];
            $totalValue = 0;
            $insufficientStockProducts = [];

            // First, check all stock availability
            foreach ($request->items as $item) {
                $availableStock = $this->stockService->getAvailableStock(
                    $item['product_id'],
                    $warehouseId
                );

                if ($availableStock < $item['quantity']) {
                    $product = Product::find($item['product_id']);
                    $insufficientStockProducts[] = [
                        'product' => $product->name,
                        'requested' => $item['quantity'],
                        'available' => $availableStock
                    ];
                }
            }

            // If any product has insufficient stock, return error with details
            if (!empty($insufficientStockProducts)) {
                return response()->json([
                    'success' => false,
                    'message' => 'Insufficient stock for some products',
                    'insufficient_products' => $insufficientStockProducts
                ], 400);
            }

            // Map reason to movement subtype - UNCOMMENTED AND FIXED
            $subtypeMap = [
                'sale' => 'SALE',
                'production' => 'USED_IN_PUJA',
                'waste' => 'WASTAGE',
                'damaged' => 'DAMAGED',
                'expired' => 'EXPIRED',
                'transfer' => 'TRANSFER_OUT',
                'other' => 'ADJUSTMENT'
            ];

            // Process each item
            foreach ($request->items as $item) {
                $product = Product::find($item['product_id']);
                $unitCost = $product->average_cost ?? 0;

                // Generate individual movement number for each item
                $itemMovementNumber = $this->generateMovementNumber('OUT');

                // Use the reason directly as the key (it's already lowercase from JS)
                $reasonKey = strtolower($item['reason']);

                // Create stock movement record
                $movement = StockMovement::create([
                    'movement_number' => $itemMovementNumber,
                    'product_id' => $item['product_id'],
                    'warehouse_id' => $warehouseId,
                    'movement_type' => 'OUT',
                    'movement_subtype' => $subtypeMap[$reasonKey] ?? 'ADJUSTMENT', // Use ADJUSTMENT as fallback
                    'quantity' => $item['quantity'],
                    'unit_cost' => $unitCost,
                    'total_cost' => ($item['quantity'] * $unitCost),
                    'reference_type' => 'BULK_OUT',
                    'reference_id' => $referenceNumber,
                    'notes' => $item['notes'] ?? null,
                    'created_by' => auth()->id(),
                    'approval_status' => 'APPROVED',
                    'approved_by' => auth()->id(),
                    'approved_at' => now()
                ]);

                // Update stock balance
                $this->stockService->updateStockBalance(
                    $item['product_id'],
                    $warehouseId,
                    $item['quantity'],
                    'OUT'
                );

                $totalValue += $movement->total_cost;

                // Get updated stock level
                $newBalance = $this->stockService->getAvailableStock(
                    $item['product_id'],
                    $warehouseId
                );

                $processedItems[] = [
                    'movement' => $movement->load(['product', 'warehouse']),
                    'previous_stock' => $newBalance + $item['quantity'],
                    'new_stock' => $newBalance,
                    'below_minimum' => ($product->min_stock_level && $newBalance < $product->min_stock_level)
                ];

                // Check if stock goes below minimum level and trigger alert
                if ($product->min_stock_level && $newBalance < $product->min_stock_level) {
                    // You can trigger low stock alert here if you have an event system
                    // event(new LowStockAlert($product, $newBalance));
                }
            }

            // Log the bulk operation
            Log::info('Bulk stock out processed', [
                'user_id' => auth()->id(),
                'reference_number' => $referenceNumber,
                'warehouse_id' => $warehouseId,
                'total_items' => count($processedItems),
                'total_value' => $totalValue
            ]);

            DB::commit();

            return response()->json([
                'success' => true,
                'message' => 'Bulk stock out processed successfully',
                'data' => [
                    'reference_number' => $referenceNumber,
                    'warehouse_id' => $warehouseId,
                    'total_items' => count($processedItems),
                    'total_value' => $totalValue,
                    'items' => $processedItems
                ]
            ]);
        } catch (\Exception $e) {
            DB::rollback();
            Log::error('Bulk stock out failed', [
                'error' => $e->getMessage(),
                'trace' => $e->getTraceAsString()
            ]);

            return response()->json([
                'success' => false,
                'message' => 'Failed to process bulk stock out: ' . $e->getMessage()
            ], 500);
        }
    }
    /**
     * Export stock movements - main export handler
     */
    public function export(Request $request)
    {
        $format = $request->get('format', 'csv'); // csv, excel, or pdf

        // Validate format
        if (!in_array($format, ['csv', 'excel', 'pdf'])) {
            return response()->json([
                'success' => false,
                'message' => 'Invalid export format'
            ], 400);
        }

        // Get filters
        $filters = [
            'from_date' => $request->from_date,
            'to_date' => $request->to_date,
            'product_id' => $request->product_id,
            'warehouse_id' => $request->warehouse_id,
            'movement_type' => $request->movement_type
        ];

        // Remove empty filters
        $filters = array_filter($filters);

        // Call appropriate export method
        switch ($format) {
            case 'excel':
                return $this->exportExcel($filters);
            case 'pdf':
                return $this->exportPDF($filters, $request);
            default:
                return $this->exportCSV($filters);
        }
    }

    /**
     * Export to CSV
     */
    private function exportCSV($filters)
    {
        try {
            $query = StockMovement::with(['product.uom', 'warehouse', 'creator'])
                ->orderBy('created_at', 'desc');

            // Apply filters
            if (!empty($filters['from_date'])) {
                $query->whereDate('created_at', '>=', $filters['from_date']);
            }
            if (!empty($filters['to_date'])) {
                $query->whereDate('created_at', '<=', $filters['to_date']);
            }
            if (!empty($filters['product_id'])) {
                $query->where('product_id', $filters['product_id']);
            }
            if (!empty($filters['warehouse_id'])) {
                $query->where('warehouse_id', $filters['warehouse_id']);
            }
            if (!empty($filters['movement_type'])) {
                $query->where('movement_type', $filters['movement_type']);
            }

            $movements = $query->limit(10000)->get();

            // Generate CSV
            $filename = 'stock_movements_' . date('Y-m-d_His') . '.csv';
            $handle = fopen('php://output', 'w');

            ob_start();

            // Headers
            fputcsv($handle, [
                'Date/Time',
                'Movement #',
                'Type',
                'Product',
                'Product Code',
                'Product Type',
                'Warehouse',
                'Quantity',
                'Unit',
                'Unit Cost',
                'Total Cost',
                'Batch Number',
                'Expiry Date',
                'Reference Type',
                'Reference ID',
                'Notes',
                'Created By',
                'Approval Status'
            ]);

            // Data rows
            foreach ($movements as $movement) {
                fputcsv($handle, [
                    $movement->created_at->format('Y-m-d H:i:s'),
                    $movement->movement_number ?? '-',
                    $movement->movement_type,
                    optional($movement->product)->name ?? '-',
                    optional($movement->product)->code ?? '-',
                    optional($movement->product)->product_type ? ucfirst(strtolower($movement->product->product_type)) : '-',
                    optional($movement->warehouse)->name ?? '-',
                    number_format($movement->quantity, 3, '.', ''),
                    optional($movement->product->uom)->name ?? '-',
                    number_format($movement->unit_cost, 2, '.', ''),
                    number_format($movement->total_cost, 2, '.', ''),
                    $movement->batch_number ?? '-',
                    $movement->expiry_date ? date('Y-m-d', strtotime($movement->expiry_date)) : '-',
                    $movement->reference_type ?? '-',
                    $movement->reference_id ?? '-',
                    $movement->notes ?? '-',
                    optional($movement->creator)->name ?? '-',
                    $movement->approval_status ?? '-'
                ]);
            }

            fclose($handle);
            $csv = ob_get_clean();

            return response($csv)
                ->header('Content-Type', 'text/csv')
                ->header('Content-Disposition', "attachment; filename=\"{$filename}\"");
        } catch (\Exception $e) {
            return response()->json([
                'success' => false,
                'message' => 'Export failed: ' . $e->getMessage()
            ], 500);
        }
    }

    /**
     * Export to Excel
     */
    private function exportExcel($filters)
    {
        try {
            $filename = 'stock_movements_' . date('Y-m-d_His') . '.xlsx';
            return Excel::download(new StockMovementsExport($filters), $filename);
        } catch (\Exception $e) {
            return response()->json([
                'success' => false,
                'message' => 'Excel export failed: ' . $e->getMessage()
            ], 500);
        }
    }

    /**
     * Export to PDF
     */
    private function exportPDF($filters, $request)
    {
        try {
            // Get temple settings
            $templeSettings = $this->getTempleSettings();

            // Build query with filters
            $query = StockMovement::with(['product.uom', 'warehouse', 'creator'])
                ->orderBy('created_at', 'desc');

            // Apply filters
            if (!empty($filters['from_date'])) {
                $query->whereDate('created_at', '>=', $filters['from_date']);
            }
            if (!empty($filters['to_date'])) {
                $query->whereDate('created_at', '<=', $filters['to_date']);
            }
            if (!empty($filters['product_id'])) {
                $query->where('product_id', $filters['product_id']);
            }
            if (!empty($filters['warehouse_id'])) {
                $query->where('warehouse_id', $filters['warehouse_id']);
            }
            if (!empty($filters['movement_type'])) {
                $query->where('movement_type', $filters['movement_type']);
            }

            $movements = $query->limit(10000)->get();

            // Prepare applied filters for display
            $appliedFilters = [];
            if (!empty($filters['from_date'])) {
                $appliedFilters['from_date'] = date('d-m-Y', strtotime($filters['from_date']));
            }
            if (!empty($filters['to_date'])) {
                $appliedFilters['to_date'] = date('d-m-Y', strtotime($filters['to_date']));
            }
            if (!empty($filters['product_id'])) {
                $product = \App\Models\Product::find($filters['product_id']);
                $appliedFilters['product_name'] = $product ? $product->name : 'Unknown';
            }
            if (!empty($filters['warehouse_id'])) {
                $warehouse = \App\Models\Warehouse::find($filters['warehouse_id']);
                $appliedFilters['warehouse_name'] = $warehouse ? $warehouse->name : 'Unknown';
            }
            if (!empty($filters['movement_type'])) {
                $appliedFilters['movement_type'] = $filters['movement_type'];
            }

            // Generate PDF
            $pdf = PDF::loadView('exports.stock_movements_pdf', [
                'movements' => $movements,
                'templeSettings' => $templeSettings,
                'appliedFilters' => $appliedFilters
            ]);

            // Set paper size and orientation
            $pdf->setPaper('A4', 'landscape');

            $filename = 'stock_movements_' . date('Y-m-d_His') . '.pdf';


            return $pdf->download($filename);
        } catch (\Exception $e) {
            \Log::error('PDF export failed: ' . $e->getMessage());
            return response()->json([
                'success' => false,
                'message' => 'PDF export failed: ' . $e->getMessage()
            ], 500);
        }
    }

    /**
     * Get temple settings from database
     */
    private function getTempleSettings()
    {
        try {
            $settings = SystemSetting::where('type', 'SYSTEM')
                ->pluck('value', 'key')
                ->toArray(); // convert to array

            // Get temple_logo signed URL if exists
            $templeLogo = $settings['temple_logo'] ?? null;
            if ($templeLogo) {
                $photoData = json_decode($templeLogo, true);
                $path = $photoData['url'] ?? $photoData['path'] ?? $templeLogo;
                $settings['temple_logo'] = app(S3UploadService::class)->getSignedUrl($path);
            }

            return [
                'temple_name'    => $settings['temple_name'] ?? 'Temple Name',
                'temple_address' => $settings['temple_address'] ?? '',
                'temple_city'    => $settings['temple_city'] ?? '',
                'temple_state'   => $settings['temple_state'] ?? '',
                'temple_pincode' => $settings['temple_pincode'] ?? '',
                'temple_country' => $settings['temple_country'] ?? 'Malaysia',
                'temple_phone'   => $settings['temple_phone'] ?? '',
                'temple_email'   => $settings['temple_email'] ?? '',
                'temple_logo'    => $settings['temple_logo'] ?? ''
            ];
        } catch (\Exception $e) {
            \Log::error('Failed to load temple settings: ' . $e->getMessage());

            return [
                'temple_name'    => 'Temple Name',
                'temple_address' => '',
                'temple_city'    => '',
                'temple_state'   => '',
                'temple_pincode' => '',
                'temple_country' => 'Malaysia',
                'temple_phone'   => '',
                'temple_email'   => '',
                'temple_logo'    => ''
            ];
        }
    }
}
