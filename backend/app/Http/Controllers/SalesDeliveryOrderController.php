<?php

namespace App\Http\Controllers;

use App\Models\SalesDeliveryOrder;
use App\Models\SalesDeliveryOrderItem;
use App\Models\SalesOrder;
use App\Models\SalesOrderItem;
use App\Models\Devotee;
use App\Models\Warehouse;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Auth;
use Illuminate\Support\Facades\Log;

class SalesDeliveryOrderController extends Controller
{
    /**
     * List all delivery orders with filters
     */
    public function index(Request $request)
    {
        $query = SalesDeliveryOrder::with([
            'salesOrder',
            'devotee',
            'warehouse',
            'creator',
            'qualityChecker'
        ])->orderBy('do_date', 'desc');

        // Apply filters
        if ($request->filled('status')) {
            $query->where('status', $request->status);
        }

        if ($request->filled('devotee_id')) {
            $query->where('devotee_id', $request->devotee_id);
        }

        if ($request->filled('sales_order_id')) {
            $query->where('sales_order_id', $request->sales_order_id);
        }

        if ($request->filled('warehouse_id')) {
            $query->where('warehouse_id', $request->warehouse_id);
        }

        if ($request->filled('date_from')) {
            $query->whereDate('do_date', '>=', $request->date_from);
        }

        if ($request->filled('date_to')) {
            $query->whereDate('do_date', '<=', $request->date_to);
        }

        if ($request->filled('search')) {
            $search = $request->search;
            $query->where(function ($q) use ($search) {
                $q->where('do_number', 'ILIKE', "%{$search}%")
                    ->orWhere('delivery_order_no', 'ILIKE', "%{$search}%")
                    ->orWhereHas('devotee', function ($dq) use ($search) {
                        $dq->where('customer_name', 'ILIKE', "%{$search}%");
                    });
            });
        }

        $perPage = $request->get('per_page', 50);
        $deliveryOrders = $query->paginate($perPage);

        return response()->json([
            'success' => true,
            'data' => $deliveryOrders
        ]);
    }

    /**
     * Get single delivery order details
     */
    public function show($id)
    {
        $deliveryOrder = SalesDeliveryOrder::with([
            'salesOrder',
            'devotee',
            'warehouse',
            'items.salesOrderItem',
            'items.salesPackage',
            'items.product',
            'items.saleItem',
            'items.uom',
            'items.warehouse',
            'creator',
            'qualityChecker',
            'approver'
        ])->find($id);

        if (!$deliveryOrder) {
            return response()->json([
                'success' => false,
                'message' => 'Delivery Order not found'
            ], 404);
        }

        return response()->json([
            'success' => true,
            'data' => $deliveryOrder
        ]);
    }

    /**
     * Get sales order details for creating DO
     */
    public function getSalesOrderForDO($salesOrderId)
    {
        $salesOrder = SalesOrder::with([
            'devotee',
            'items',
            'items.salesPackage',
            'items.product',
            'items.saleItem',
            'items.uom'
        ])->find($salesOrderId);

        if (!$salesOrder) {
            return response()->json([
                'success' => false,
                'message' => 'Sales Order not found'
            ], 404);
        }

        if ($salesOrder->status !== 'APPROVED') {
            return response()->json([
                'success' => false,
                'message' => 'Only approved sales orders can be converted to delivery orders'
            ], 400);
        }

        // Process each item and expand package items from JSONB
        $salesOrder->items->transform(function ($item) {
            $item->remaining_quantity = $item->quantity - ($item->delivered_quantity ?? 0);
            $item->can_deliver = $item->remaining_quantity > 0;
            $item->has_existing_do = ($item->delivered_quantity ?? 0) > 0;

            // For package items, parse and expand JSONB items
            if (!$item->is_addon && $item->salesPackage) {
                $packageItems = $item->salesPackage->items ?? [];

                if (is_array($packageItems) && count($packageItems) > 0) {
                    $expandedItems = [];

                    foreach ($packageItems as $index => $pkgItem) {
                        $expandedItem = [
                            'index' => $index,
                            'item_id' => $pkgItem['item_id'] ?? null,
                            'item_name' => $pkgItem['item_name'] ?? 'Unknown Item',
                            'type' => $pkgItem['type'] ?? 'product',
                            'quantity' => $pkgItem['quantity'] ?? 0,
                            'uom' => $pkgItem['uom'] ?? '',
                            'ordered_quantity' => ($pkgItem['quantity'] ?? 0) * $item->quantity,
                            'delivered_quantity' => ($pkgItem['quantity'] ?? 0) * ($item->delivered_quantity ?? 0),
                            'remaining_quantity' => ($pkgItem['quantity'] ?? 0) * $item->remaining_quantity,
                            'can_deliver' => (($pkgItem['quantity'] ?? 0) * $item->remaining_quantity) > 0,
                            'unit_price' => $pkgItem['unit_price'] ?? $pkgItem['rate'] ?? 0,
                            'amount' => $pkgItem['amount'] ?? 0,
                            'sales_order_item_id' => $item->id,
                            'package_quantity' => $item->quantity,
                        ];

                        $expandedItems[] = $expandedItem;
                    }

                    $item->package_items = $expandedItems;
                }
            }

            return $item;
        });

        return response()->json([
            'success' => true,
            'data' => $salesOrder
        ]);
    }

    /**
     * Create delivery order from sales order
     */
    public function createFromSalesOrder(Request $request)
    {
        $request->validate([
            'sales_order_id' => 'required|exists:sales_orders,id',
            'do_date' => 'required|date',
            'delivery_order_no' => 'nullable|string|max:255',
            'delivery_date' => 'nullable|date',
            'vehicle_number' => 'nullable|string|max:50',
            'warehouse_id' => 'required|exists:warehouses,id',
            'items' => 'required|array|min:1',
            'items.*.sales_order_item_id' => 'required|exists:sales_order_items,id',
            'items.*.delivered_quantity' => 'required|numeric|min:0.001',
            'items.*.package_item_index' => 'nullable|integer|min:0',
            'items.*.item_id' => 'nullable|string',
            'items.*.item_type' => 'nullable|in:product,sales_item',
        ]);

        DB::beginTransaction();

        try {
            $salesOrder = SalesOrder::with(['devotee', 'items.salesPackage'])->find($request->sales_order_id);

            if (!$salesOrder) {
                throw new \Exception('Sales Order not found');
            }

            if ($salesOrder->status !== 'APPROVED') {
                throw new \Exception('Only approved sales orders can be converted to delivery orders');
            }

            // Create Delivery Order
            $deliveryOrder = SalesDeliveryOrder::create([
                'do_date' => $request->do_date,
                'sales_order_id' => $salesOrder->id,
                'devotee_id' => $salesOrder->devotee_id,
                'delivery_order_no' => $request->delivery_order_no,
                'delivery_date' => $request->delivery_date,
                'vehicle_number' => $request->vehicle_number,
                'warehouse_id' => $request->warehouse_id,
                'notes' => $request->notes,
                'status' => 'DRAFT',
                'created_by' => Auth::id(),
                'updated_by' => Auth::id(),
            ]);

            $subtotal = 0;
            $totalTax = 0;
            $totalDiscount = 0;

            // Group items by sales_order_item_id
            $itemsBySOItem = collect($request->items)->groupBy('sales_order_item_id');

            foreach ($itemsBySOItem as $soItemId => $deliveryItems) {
                $soItem = SalesOrderItem::with('salesPackage')->find($soItemId);

                if (!$soItem) {
                    throw new \Exception("Sales Order Item not found: {$soItemId}");
                }

                $soItemRemainingQty = $soItem->quantity - ($soItem->delivered_quantity ?? 0);
                $hasPackageItems = $deliveryItems->whereNotNull('package_item_index')->count() > 0;

                if ($hasPackageItems && $soItem->salesPackage) {
                    $packageItems = $soItem->salesPackage->items ?? [];

                    foreach ($deliveryItems as $itemData) {
                        if (!isset($itemData['package_item_index'])) continue;

                        $pkgItemIndex = $itemData['package_item_index'];

                        if (!isset($packageItems[$pkgItemIndex])) {
                            throw new \Exception("Package item at index {$pkgItemIndex} not found");
                        }

                        $packageItem = $packageItems[$pkgItemIndex];
                        $itemQtyPerPackage = $packageItem['quantity'] ?? 0;
                        $maxDeliverable = $itemQtyPerPackage * $soItemRemainingQty;

                        if ($itemData['delivered_quantity'] > $maxDeliverable) {
                            throw new \Exception(
                                "Delivery quantity ({$itemData['delivered_quantity']}) exceeds remaining ({$maxDeliverable}) for item: " . ($packageItem['item_name'] ?? 'Unknown')
                            );
                        }

                        $description = $packageItem['item_name'] ?? 'Package Item';
                        $unitPrice = $packageItem['unit_price'] ?? $packageItem['rate'] ?? 0;

                        $doItem = SalesDeliveryOrderItem::create([
                            'delivery_order_id' => $deliveryOrder->id,
                            'sales_order_item_id' => $soItem->id,
                            'is_addon' => false,
                            'sales_package_id' => $soItem->sales_package_id,
                            'package_item_index' => $pkgItemIndex,
                            'product_id' => ($packageItem['type'] ?? '') === 'product' ? $packageItem['item_id'] : null,
                            'sale_item_id' => ($packageItem['type'] ?? '') === 'sales_item' ? $packageItem['item_id'] : null,
                            'item_type' => $packageItem['type'] ?? null,
                            'description' => $description,
                            'ordered_quantity' => $itemQtyPerPackage * $soItem->quantity,
                            'delivered_quantity' => $itemData['delivered_quantity'],
                            'unit_price' => $unitPrice,
                            'tax_amount' => 0,
                            'discount_amount' => 0,
                            'uom_id' => null,
                            'warehouse_id' => $request->warehouse_id,
                            'sort_order' => $pkgItemIndex,
                        ]);

                        $itemSubtotal = $doItem->delivered_quantity * $doItem->unit_price;
                        $subtotal += $itemSubtotal;
                        $doItem->total_amount = $itemSubtotal;
                        $doItem->save();
                    }

                    // Update SO item delivery tracking
                    $totalItemsInPackage = count($packageItems);
                    if ($totalItemsInPackage > 0) {
                        $totalPackageDelivered = 0;
                        foreach ($deliveryItems as $itemData) {
                            if (isset($itemData['package_item_index'])) {
                                $pkgItemIndex = $itemData['package_item_index'];
                                $itemQtyPerPackage = $packageItems[$pkgItemIndex]['quantity'] ?? 1;
                                if ($itemQtyPerPackage > 0) {
                                    $packageQtyDelivered = $itemData['delivered_quantity'] / $itemQtyPerPackage;
                                    $totalPackageDelivered += $packageQtyDelivered;
                                }
                            }
                        }
                        $avgPackageDelivered = $totalPackageDelivered / $deliveryItems->count();
                        $soItem->delivered_quantity = ($soItem->delivered_quantity ?? 0) + $avgPackageDelivered;
                    }

                    if ($soItem->delivered_quantity >= $soItem->quantity) {
                        $soItem->delivery_status = 'COMPLETED';
                    } else {
                        $soItem->delivery_status = 'PARTIAL';
                    }
                    $soItem->save();
                } else {
                    $itemData = $deliveryItems->first();

                    if ($itemData['delivered_quantity'] > $soItemRemainingQty) {
                        throw new \Exception(
                            "Delivery quantity ({$itemData['delivered_quantity']}) exceeds remaining quantity ({$soItemRemainingQty})"
                        );
                    }

                    $doItem = SalesDeliveryOrderItem::create([
                        'delivery_order_id' => $deliveryOrder->id,
                        'sales_order_item_id' => $soItem->id,
                        'is_addon' => $soItem->is_addon,
                        'sales_package_id' => $soItem->sales_package_id,
                        'product_id' => $soItem->product_id,
                        'sale_item_id' => $soItem->sale_item_id,
                        'item_type' => $soItem->item_type,
                        'description' => $soItem->description,
                        'ordered_quantity' => $soItem->quantity,
                        'delivered_quantity' => $itemData['delivered_quantity'],
                        'unit_price' => $soItem->unit_price,
                        'tax_amount' => $soItem->tax_amount * ($itemData['delivered_quantity'] / $soItem->quantity),
                        'discount_amount' => $soItem->discount_amount * ($itemData['delivered_quantity'] / $soItem->quantity),
                        'uom_id' => $soItem->uom_id,
                        'warehouse_id' => $request->warehouse_id,
                        'sort_order' => 0,
                    ]);

                    $itemSubtotal = $doItem->delivered_quantity * $doItem->unit_price;
                    $subtotal += $itemSubtotal;
                    $totalTax += $doItem->tax_amount;
                    $totalDiscount += $doItem->discount_amount;

                    $doItem->total_amount = $itemSubtotal + $doItem->tax_amount - $doItem->discount_amount;
                    $doItem->save();

                    $soItem->delivered_quantity = ($soItem->delivered_quantity ?? 0) + $itemData['delivered_quantity'];

                    if ($soItem->delivered_quantity >= $soItem->quantity) {
                        $soItem->delivery_status = 'COMPLETED';
                    } else {
                        $soItem->delivery_status = 'PARTIAL';
                    }

                    $soItem->save();
                }
            }

            $deliveryOrder->update([
                'subtotal' => $subtotal,
                'total_tax' => $totalTax,
                'discount_amount' => $totalDiscount,
                'total_amount' => $subtotal + $totalTax - $totalDiscount,
            ]);

            DB::commit();

            $deliveryOrder->load([
                'salesOrder',
                'devotee',
                'warehouse',
                'items.salesOrderItem',
                'items.salesPackage',
                'items.product',
                'items.saleItem'
            ]);

            return response()->json([
                'success' => true,
                'message' => 'Delivery Order created successfully',
                'data' => $deliveryOrder
            ]);
        } catch (\Exception $e) {
            DB::rollback();
            Log::error('Delivery Order Creation Failed: ' . $e->getMessage(), [
                'request' => $request->all(),
                'trace' => $e->getTraceAsString()
            ]);
            return response()->json([
                'success' => false,
                'message' => 'Failed to create Delivery Order',
                'error' => $e->getMessage()
            ], 500);
        }
    }

    /**
     * Create standalone delivery order (with packages and selective item delivery)
     * NEW: Supports selective item delivery within packages
     */
    public function store(Request $request)
    {
        $request->validate([
            'do_date' => 'required|date',
            'devotee_id' => 'required|exists:devotees,id',
            'delivery_order_no' => 'nullable|string|max:255',
            'delivery_date' => 'nullable|date',
            'vehicle_number' => 'nullable|string|max:50',
            'warehouse_id' => 'required|exists:warehouses,id',
            'packages' => 'required|array|min:1',
            'packages.*.package_id' => 'required|exists:sales_packages,id',
            'packages.*.quantity' => 'required|numeric|min:1',
            'packages.*.unit_price' => 'required|numeric|min:0',
            'packages.*.tax_amount' => 'nullable|numeric|min:0',
            'packages.*.discount_amount' => 'nullable|numeric|min:0',
            // NEW: Optional items array for selective delivery
            'packages.*.items' => 'nullable|array',
            'packages.*.items.*.index' => 'required_with:packages.*.items|integer|min:0',
            'packages.*.items.*.delivered_quantity' => 'required_with:packages.*.items|numeric|min:0.001',
        ]);

        DB::beginTransaction();

        try {
            // Create Delivery Order
            $deliveryOrder = SalesDeliveryOrder::create([
                'do_date' => $request->do_date,
                'devotee_id' => $request->devotee_id,
                'delivery_order_no' => $request->delivery_order_no,
                'delivery_date' => $request->delivery_date,
                'vehicle_number' => $request->vehicle_number,
                'warehouse_id' => $request->warehouse_id,
                'driver_name' => $request->driver_name,
                'driver_contact' => $request->driver_contact,
                'notes' => $request->notes,
                'status' => 'DRAFT',
                'created_by' => Auth::id(),
                'updated_by' => Auth::id(),
            ]);

            $subtotal = 0;
            $totalTax = 0;
            $totalDiscount = 0;

            // Process each package
            foreach ($request->packages as $packageData) {
                $packageId = $packageData['package_id'];
                $packageQty = $packageData['quantity'];

                // Load package with items
                $package = \App\Models\SalesPackage::find($packageId);

                if (!$package) {
                    throw new \Exception("Package not found: {$packageId}");
                }

                $packageItems = $package->items ?? [];

                if (!is_array($packageItems) || count($packageItems) === 0) {
                    throw new \Exception("Package has no items: {$package->package_name}");
                }

                // Calculate totals for this package instance
                $packageSubtotal = $packageData['unit_price'] * $packageQty;
                $packageTax = ($packageData['tax_amount'] ?? 0) * $packageQty;
                $packageDiscount = ($packageData['discount_amount'] ?? 0) * $packageQty;

                $subtotal += $packageSubtotal;
                $totalTax += $packageTax;
                $totalDiscount += $packageDiscount;

                // Check if we have selective items or deliver all
                $hasSelectiveItems = isset($packageData['items']) && is_array($packageData['items']) && count($packageData['items']) > 0;

                if ($hasSelectiveItems) {
                    // NEW: Selective item delivery - only create DO items for selected items
                    foreach ($packageData['items'] as $selectedItem) {
                        $itemIndex = $selectedItem['index'];
                        $deliveredQty = $selectedItem['delivered_quantity'];

                        if (!isset($packageItems[$itemIndex])) {
                            throw new \Exception("Package item at index {$itemIndex} not found in package: {$package->package_name}");
                        }

                        $pkgItem = $packageItems[$itemIndex];
                        $itemQtyPerPackage = $pkgItem['quantity'] ?? 0;
                        $maxQty = $itemQtyPerPackage * $packageQty;

                        // Validate delivered quantity
                        if ($deliveredQty > $maxQty) {
                            throw new \Exception(
                                "Delivered quantity ({$deliveredQty}) exceeds maximum ({$maxQty}) for item: " . ($pkgItem['item_name'] ?? 'Unknown')
                            );
                        }

                        $itemName = $pkgItem['item_name'] ?? 'Unknown Item';
                        $itemType = $pkgItem['type'] ?? 'product';
                        $itemId = $pkgItem['item_id'] ?? null;
                        $itemUnitPrice = $pkgItem['unit_price'] ?? $pkgItem['rate'] ?? 0;

                        // Create DO item for selected item
                        SalesDeliveryOrderItem::create([
                            'delivery_order_id' => $deliveryOrder->id,
                            'sales_order_item_id' => null,
                            'is_addon' => false,
                            'sales_package_id' => $package->id,
                            'package_item_index' => $itemIndex,
                            'product_id' => $itemType === 'product' ? $itemId : null,
                            'sale_item_id' => $itemType === 'sales_item' ? $itemId : null,
                            'item_type' => $itemType,
                            'description' => $itemName,
                            'ordered_quantity' => $maxQty,
                            'delivered_quantity' => $deliveredQty,
                            'unit_price' => $itemUnitPrice,
                            'tax_amount' => 0,
                            'discount_amount' => 0,
                            'total_amount' => $deliveredQty * $itemUnitPrice,
                            'uom_id' => null,
                            'warehouse_id' => $request->warehouse_id,
                            'sort_order' => $itemIndex,
                        ]);
                    }
                } else {
                    // Original behavior: Create DO items for ALL items in the package
                    foreach ($packageItems as $index => $pkgItem) {
                        $itemQtyPerPackage = $pkgItem['quantity'] ?? 0;
                        $totalItemQty = $itemQtyPerPackage * $packageQty;

                        $itemName = $pkgItem['item_name'] ?? 'Unknown Item';
                        $itemType = $pkgItem['type'] ?? 'product';
                        $itemId = $pkgItem['item_id'] ?? null;
                        $itemUnitPrice = $pkgItem['unit_price'] ?? $pkgItem['rate'] ?? 0;

                        SalesDeliveryOrderItem::create([
                            'delivery_order_id' => $deliveryOrder->id,
                            'sales_order_item_id' => null,
                            'is_addon' => false,
                            'sales_package_id' => $package->id,
                            'package_item_index' => $index,
                            'product_id' => $itemType === 'product' ? $itemId : null,
                            'sale_item_id' => $itemType === 'sales_item' ? $itemId : null,
                            'item_type' => $itemType,
                            'description' => $itemName,
                            'ordered_quantity' => $totalItemQty,
                            'delivered_quantity' => $totalItemQty,
                            'unit_price' => $itemUnitPrice,
                            'tax_amount' => 0,
                            'discount_amount' => 0,
                            'total_amount' => $totalItemQty * $itemUnitPrice,
                            'uom_id' => null,
                            'warehouse_id' => $request->warehouse_id,
                            'sort_order' => $index,
                        ]);
                    }
                }
            }

            // Update DO totals
            $deliveryOrder->update([
                'subtotal' => $subtotal,
                'total_tax' => $totalTax,
                'discount_amount' => $totalDiscount,
                'total_amount' => $subtotal + $totalTax - $totalDiscount,
            ]);

            DB::commit();

            $deliveryOrder->load(['devotee', 'warehouse', 'items.salesPackage', 'items.product', 'items.saleItem']);

            return response()->json([
                'success' => true,
                'message' => 'Delivery Order created successfully',
                'data' => $deliveryOrder
            ]);
        } catch (\Exception $e) {
            DB::rollback();
            Log::error('Standalone Delivery Order Creation Failed: ' . $e->getMessage(), [
                'request' => $request->all(),
                'trace' => $e->getTraceAsString()
            ]);
            return response()->json([
                'success' => false,
                'message' => 'Failed to create Delivery Order',
                'error' => $e->getMessage()
            ], 500);
        }
    }

    /**
     * Update delivery order
     */
    public function update(Request $request, $id)
    {
        $deliveryOrder = SalesDeliveryOrder::find($id);

        if (!$deliveryOrder) {
            return response()->json([
                'success' => false,
                'message' => 'Delivery Order not found'
            ], 404);
        }

        if (!$deliveryOrder->canEdit()) {
            return response()->json([
                'success' => false,
                'message' => 'Only draft or quality check delivery orders can be edited'
            ], 400);
        }

        $request->validate([
            'do_date' => 'required|date',
            'delivery_order_no' => 'nullable|string|max:255',
            'delivery_date' => 'nullable|date',
            'vehicle_number' => 'nullable|string|max:50',
            'warehouse_id' => 'required|exists:warehouses,id',
        ]);

        DB::beginTransaction();

        try {
            $deliveryOrder->update([
                'do_date' => $request->do_date,
                'delivery_order_no' => $request->delivery_order_no,
                'delivery_date' => $request->delivery_date,
                'vehicle_number' => $request->vehicle_number,
                'warehouse_id' => $request->warehouse_id,
                'driver_name' => $request->driver_name,
                'driver_contact' => $request->driver_contact,
                'notes' => $request->notes,
                'updated_by' => Auth::id(),
            ]);

            DB::commit();

            $deliveryOrder->load(['devotee', 'warehouse', 'items']);

            return response()->json([
                'success' => true,
                'message' => 'Delivery Order updated successfully',
                'data' => $deliveryOrder
            ]);
        } catch (\Exception $e) {
            DB::rollback();
            return response()->json([
                'success' => false,
                'message' => 'Failed to update Delivery Order',
                'error' => $e->getMessage()
            ], 500);
        }
    }

    /**
     * Perform quality check
     */
    public function performQualityCheck(Request $request, $id)
    {
        $deliveryOrder = SalesDeliveryOrder::with('items')->find($id);

        if (!$deliveryOrder) {
            return response()->json([
                'success' => false,
                'message' => 'Delivery Order not found'
            ], 404);
        }

        if (!$deliveryOrder->canPerformQualityCheck()) {
            return response()->json([
                'success' => false,
                'message' => 'Quality check already completed or order is cancelled'
            ], 400);
        }

        $request->validate([
            'quality_check_date' => 'required|date',
            'quality_notes' => 'nullable|string',
            'items' => 'required|array|min:1',
            'items.*.id' => 'required|exists:sales_delivery_order_items,id',
            'items.*.accepted_quantity' => 'required|numeric|min:0',
            'items.*.rejected_quantity' => 'nullable|numeric|min:0',
            'items.*.condition' => 'required|in:GOOD,DAMAGED,DEFECTIVE',
            'items.*.rejection_reason' => 'nullable|string',
        ]);

        DB::beginTransaction();

        try {
            $overallStatus = 'PASSED';
            $hasPartial = false;
            $hasFailed = false;

            foreach ($request->items as $itemData) {
                $doItem = SalesDeliveryOrderItem::find($itemData['id']);

                if ($doItem && $doItem->delivery_order_id === $deliveryOrder->id) {
                    $acceptedQty = $itemData['accepted_quantity'];
                    $rejectedQty = $itemData['rejected_quantity'] ?? 0;

                    if (($acceptedQty + $rejectedQty) != $doItem->delivered_quantity) {
                        throw new \Exception(
                            "Accepted + Rejected quantity must equal delivered quantity for item: {$doItem->description}"
                        );
                    }

                    $doItem->update([
                        'accepted_quantity' => $acceptedQty,
                        'rejected_quantity' => $rejectedQty,
                        'condition_on_delivery' => $itemData['condition'],
                        'rejection_reason' => $itemData['rejection_reason'] ?? null,
                    ]);

                    if ($rejectedQty > 0) {
                        $hasPartial = true;
                    }
                    if ($acceptedQty == 0) {
                        $hasFailed = true;
                    }
                }
            }

            if ($hasFailed) {
                $overallStatus = 'FAILED';
            } elseif ($hasPartial) {
                $overallStatus = 'PARTIAL';
            }

            $deliveryOrder->update([
                'quality_check_done' => true,
                'quality_check_by' => Auth::id(),
                'quality_check_date' => $request->quality_check_date,
                'quality_check_status' => $overallStatus,
                'quality_notes' => $request->quality_notes,
                'status' => 'QUALITY_CHECK',
                'updated_by' => Auth::id(),
            ]);

            DB::commit();

            $deliveryOrder->load(['items', 'qualityChecker']);

            return response()->json([
                'success' => true,
                'message' => 'Quality check completed successfully',
                'data' => $deliveryOrder
            ]);
        } catch (\Exception $e) {
            DB::rollback();
            Log::error('Quality Check Failed: ' . $e->getMessage());
            return response()->json([
                'success' => false,
                'message' => 'Failed to complete quality check',
                'error' => $e->getMessage()
            ], 500);
        }
    }

    /**
     * Complete delivery order
     */
    public function complete(Request $request, $id)
    {
        $deliveryOrder = SalesDeliveryOrder::find($id);

        if (!$deliveryOrder) {
            return response()->json([
                'success' => false,
                'message' => 'Delivery Order not found'
            ], 404);
        }

        if ($deliveryOrder->status === 'COMPLETED') {
            return response()->json([
                'success' => false,
                'message' => 'Delivery Order already completed'
            ], 400);
        }

        DB::beginTransaction();

        try {
            $deliveryOrder->markCompleted(Auth::id());
            DB::commit();

            return response()->json([
                'success' => true,
                'message' => 'Delivery Order completed successfully',
                'data' => $deliveryOrder
            ]);
        } catch (\Exception $e) {
            DB::rollback();
            return response()->json([
                'success' => false,
                'message' => 'Failed to complete Delivery Order',
                'error' => $e->getMessage()
            ], 500);
        }
    }

    /**
     * Cancel delivery order
     */
    public function cancel(Request $request, $id)
    {
        $deliveryOrder = SalesDeliveryOrder::find($id);

        if (!$deliveryOrder) {
            return response()->json([
                'success' => false,
                'message' => 'Delivery Order not found'
            ], 404);
        }

        if ($deliveryOrder->status === 'COMPLETED') {
            return response()->json([
                'success' => false,
                'message' => 'Completed delivery orders cannot be cancelled'
            ], 400);
        }

        $request->validate([
            'reason' => 'nullable|string|max:500',
        ]);

        DB::beginTransaction();

        try {
            $deliveryOrder->cancel($request->reason);
            DB::commit();

            return response()->json([
                'success' => true,
                'message' => 'Delivery Order cancelled successfully',
                'data' => $deliveryOrder
            ]);
        } catch (\Exception $e) {
            DB::rollback();
            return response()->json([
                'success' => false,
                'message' => 'Failed to cancel Delivery Order',
                'error' => $e->getMessage()
            ], 500);
        }
    }

    /**
     * Delete delivery order
     */
    public function destroy($id)
    {
        $deliveryOrder = SalesDeliveryOrder::find($id);

        if (!$deliveryOrder) {
            return response()->json([
                'success' => false,
                'message' => 'Delivery Order not found'
            ], 404);
        }

        if (!$deliveryOrder->canDelete()) {
            return response()->json([
                'success' => false,
                'message' => 'Only draft delivery orders can be deleted'
            ], 400);
        }

        DB::beginTransaction();

        try {
            foreach ($deliveryOrder->items as $doItem) {
                if ($doItem->salesOrderItem) {
                    $soItem = $doItem->salesOrderItem;
                    $soItem->delivered_quantity -= $doItem->delivered_quantity;
                    $soItem->remaining_quantity = $soItem->quantity - $soItem->delivered_quantity;
                    $soItem->delivery_status = $soItem->delivered_quantity > 0 ? 'PARTIAL' : 'PENDING';
                    $soItem->save();
                }
            }

            $deliveryOrder->delete();
            DB::commit();

            return response()->json([
                'success' => true,
                'message' => 'Delivery Order deleted successfully'
            ]);
        } catch (\Exception $e) {
            DB::rollback();
            return response()->json([
                'success' => false,
                'message' => 'Failed to delete Delivery Order',
                'error' => $e->getMessage()
            ], 500);
        }
    }

    /**
     * Get delivery statistics
     */
    public function getStatistics(Request $request)
    {
        $query = SalesDeliveryOrder::query();

        if ($request->filled('date_from')) {
            $query->whereDate('do_date', '>=', $request->date_from);
        }

        if ($request->filled('date_to')) {
            $query->whereDate('do_date', '<=', $request->date_to);
        }

        $stats = [
            'total_dos' => $query->count(),
            'draft' => (clone $query)->where('status', 'DRAFT')->count(),
            'quality_check' => (clone $query)->where('status', 'QUALITY_CHECK')->count(),
            'completed' => (clone $query)->where('status', 'COMPLETED')->count(),
            'cancelled' => (clone $query)->where('status', 'CANCELLED')->count(),
            'total_value' => (clone $query)->where('status', 'COMPLETED')->sum('total_amount'),
            'pending_quality' => (clone $query)->where('quality_check_done', false)
                ->where('status', '!=', 'CANCELLED')->count(),
        ];

        return response()->json([
            'success' => true,
            'data' => $stats
        ]);
    }

    /**
     * Get active devotees for dropdown
     */
    public function getActiveDevotees()
    {
        $devotees = Devotee::where('is_active', true)
            ->orderBy('customer_name')
            ->get(['*']);

        return response()->json([
            'success' => true,
            'data' => $devotees
        ]);
    }

    /**
     * Get overview statistics
     */
    public function overview(Request $request)
    {
        try {
            $totalDos = SalesDeliveryOrder::count();
            $pendingQuality = SalesDeliveryOrder::where('status', 'DRAFT')
                ->where('quality_check_done', false)
                ->count();
            $completed = SalesDeliveryOrder::where('status', 'COMPLETED')->count();
            $totalValue = SalesDeliveryOrder::where('status', 'COMPLETED')->sum('total_amount') ?? 0;

            return response()->json([
                'success' => true,
                'data' => [
                    'total_dos' => $totalDos,
                    'pending_quality' => $pendingQuality,
                    'completed' => $completed,
                    'total_value' => $totalValue
                ]
            ]);
        } catch (\Exception $e) {
            return response()->json([
                'success' => false,
                'message' => 'Failed to load statistics: ' . $e->getMessage(),
                'data' => [
                    'total_dos' => 0,
                    'pending_quality' => 0,
                    'completed' => 0,
                    'total_value' => 0
                ]
            ], 500);
        }
    }

    /**
     * Get active warehouses for dropdown
     */
    public function getActiveWarehouses()
    {
        $warehouses = Warehouse::where('is_active', true)
            ->orderBy('name')
            ->get(['id', 'name', 'code']);

        return response()->json([
            'success' => true,
            'data' => $warehouses
        ]);
    }

    /**
     * Check stock for specific products (for standalone DO creation)
     */
    public function checkStockByProducts(Request $request)
    {
        try {
            $request->validate([
                'warehouse_id' => 'required|exists:warehouses,id',
                'product_ids' => 'required|array',
                'product_ids.*' => 'required|string',
            ]);

            $stockAvailability = [];

            if (!empty($request->product_ids)) {
                $stocks = \App\Models\ProductStock::whereIn('product_id', $request->product_ids)
                    ->where('warehouse_id', $request->warehouse_id)
                    ->get()
                    ->keyBy('product_id');

                foreach ($request->product_ids as $productId) {
                    $stock = $stocks->get($productId);
                    $stockAvailability[$productId] = $stock ? (float)$stock->quantity : 0;
                }
            }

            return response()->json([
                'success' => true,
                'data' => $stockAvailability
            ]);
        } catch (\Exception $e) {
            Log::error('Check Stock By Products Error: ' . $e->getMessage(), [
                'warehouse_id' => $request->warehouse_id ?? null,
                'product_ids' => $request->product_ids ?? null,
                'trace' => $e->getTraceAsString()
            ]);

            return response()->json([
                'success' => false,
                'message' => 'Failed to check stock availability: ' . $e->getMessage()
            ], 500);
        }
    }

    /**
     * Check stock availability for sales order items or product list
     */
    public function checkStock(Request $request)
    {
        try {
            // Support both formats: from sales order or direct product IDs
            if ($request->filled('sales_order_id')) {
                $request->validate([
                    'sales_order_id' => 'required|exists:sales_orders,id',
                    'warehouse_id' => 'required|exists:warehouses,id',
                ]);

                $salesOrder = SalesOrder::with(['items.salesPackage'])->find($request->sales_order_id);

                if (!$salesOrder) {
                    return response()->json([
                        'success' => false,
                        'message' => 'Sales Order not found'
                    ], 404);
                }

                $productIds = [];

                foreach ($salesOrder->items as $item) {
                    if (!$item->is_addon && $item->product_id) {
                        $productIds[] = $item->product_id;
                    } elseif ($item->is_addon && $item->product_id) {
                        $productIds[] = $item->product_id;
                    }

                    if ($item->salesPackage) {
                        $packageItems = $item->salesPackage->items ?? [];
                        foreach ($packageItems as $pkgItem) {
                            if (isset($pkgItem['type']) && $pkgItem['type'] === 'product' && isset($pkgItem['item_id'])) {
                                $productIds[] = $pkgItem['item_id'];
                            }
                        }
                    }
                }

                $productIds = array_unique($productIds);
            } elseif ($request->filled('product_ids')) {
                // Direct product IDs (for standalone DO)
                $request->validate([
                    'warehouse_id' => 'required|exists:warehouses,id',
                    'product_ids' => 'required|array',
                ]);

                $productIds = $request->product_ids;
            } else {
                return response()->json([
                    'success' => false,
                    'message' => 'Either sales_order_id or product_ids is required'
                ], 422);
            }

            if (empty($productIds)) {
                return response()->json([
                    'success' => true,
                    'data' => []
                ]);
            }

            $stocks = \App\Models\ProductStock::whereIn('product_id', $productIds)
                ->where('warehouse_id', $request->warehouse_id)
                ->get()
                ->keyBy('product_id');

            $stockAvailability = [];
            foreach ($productIds as $productId) {
                $stock = $stocks->get($productId);
                $stockAvailability[$productId] = $stock ? (float)$stock->quantity : 0;
            }

            return response()->json([
                'success' => true,
                'data' => $stockAvailability
            ]);
        } catch (\Illuminate\Validation\ValidationException $e) {
            return response()->json([
                'success' => false,
                'message' => 'Validation failed',
                'errors' => $e->errors()
            ], 422);
        } catch (\Exception $e) {
            Log::error('Check Stock Error: ' . $e->getMessage(), [
                'sales_order_id' => $request->sales_order_id ?? null,
                'warehouse_id' => $request->warehouse_id ?? null,
                'trace' => $e->getTraceAsString()
            ]);

            return response()->json([
                'success' => false,
                'message' => 'Failed to check stock availability: ' . $e->getMessage()
            ], 500);
        }
    }
}