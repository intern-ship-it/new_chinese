<?php

namespace App\Http\Controllers;

use App\Models\PurchaseRequest;
use App\Models\PurchaseRequestItem;
use App\Models\PurchaseOrder;
use App\Models\PurchaseOrderItem;
use App\Models\PurchaseRequestItemConversion;
use App\Models\TaxMaster;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Auth;
use Illuminate\Support\Facades\Validator;
use Carbon\Carbon;
use Illuminate\Support\Facades\Log;

class PurchaseRequestController extends Controller
{
    public function index(Request $request)
    {


        $query = PurchaseRequest::with(['items', 'requester']);

        // Apply filters (removed status filter)
        if ($request->filled('priority')) {
            $query->where('priority', $request->priority);
        }

        if ($request->filled('date_from')) {
            $query->whereDate('request_date', '>=', Carbon::parse($request->date_from)->format('Y-m-d'));
        }

        if ($request->filled('date_to')) {
            $query->whereDate('request_date', '<=', Carbon::parse($request->date_to)->format('Y-m-d'));
        }

        if ($request->filled('converted')) {
            $query->where('converted_to_po', $request->converted === 'yes');
        }

        $requests = $query->orderBy('created_at', 'desc')
            ->paginate($request->per_page ?? 50);

        // Calculate statistics
        $baseQuery = PurchaseRequest::query();

        $statistics = [
            'total' => $baseQuery->count(),
            'pending_conversion' => $baseQuery->clone()->where('converted_to_po', false)->count(),
            'converted' => $baseQuery->clone()->where('converted_to_po', true)->count(),
        ];
        $user = Auth::user();

        $permissions = [
            'can_create_purchase_requests' => $user->can('purchase_requests.create'),
            'can_edit_purchase_requests' => $user->can('purchase_requests.edit'),
            'can_delete_purchase_requests' => $user->can('purchase_requests.delete'),
            'can_view_purchase_requests' => $user->can('purchase_requests.view'),
            'can_convert_purchase_requests' => $user->can('purchase.request.convert'),
           ];
        return response()->json([
            'success' => true,
            'data' => $requests,
            'statistics' => $statistics,
            'permissions' => $permissions
        ]);
    }

    public function store(Request $request)
    {
        if (!Auth::user()->can('purchase_requests.create')) {
            return response()->json([
                'success' => false,
                'message' => 'You do not have permission to create purchase requests'
            ], 403);
        }
        $messages = [
            'items.*.uom_id.exists' => 'Invalid UOM selected for item :position',
            'items.*.uom_id.required' => 'UOM is required for item :position'
        ];

        $validator = Validator::make($request->all(), [
            'purpose' => 'required|string',
            'required_by_date' => 'nullable|date|after:today',
            'priority' => 'in:LOW,NORMAL,HIGH,URGENT',
            'items' => 'required|array|min:1',
            'items.*.item_type' => 'required|in:product,service',
            'items.*.product_id' => 'required_if:items.*.item_type,product|nullable|exists:products,id',
            'items.*.service_id' => 'required_if:items.*.item_type,service|nullable|exists:services,id',
            'items.*.quantity' => 'nullable|numeric|min:0',
            'items.*.uom_id' => 'nullable|exists:uoms,id',
        ], $messages);

        if ($validator->fails()) {
            return response()->json([
                'success' => false,
                'message' => 'Validation failed',
                'errors' => $validator->errors()
            ], 422);
        }

        DB::beginTransaction();
        try {
            // Create PR
            $prData = $request->except('items');
            $prData['pr_number'] = PurchaseRequest::generatePRNumber();
            $prData['request_date'] = now();
            $prData['requested_by'] = Auth::id();
            $prData['created_by'] = Auth::id();
            $prData['converted_to_po'] = false;
            $prData['status'] = "APPROVED";

            $pr = PurchaseRequest::create($prData);

            // Add items
            foreach ($request->items as $index => $item) {
                $item['pr_id'] = $pr->id;
                $item['sort_order'] = $index;
                PurchaseRequestItem::create($item);
            }

            DB::commit();

            return response()->json([
                'success' => true,
                'message' => 'Purchase request created successfully',
                'data' => $pr->load('items')
            ], 201);
        } catch (\Exception $e) {
            DB::rollback();
            return response()->json([
                'success' => false,
                'message' => 'Failed to create purchase request',
                'error' => $e->getMessage()
            ], 500);
        }
    }

    public function update($id, Request $request)
    {
        if (!Auth::user()->can('purchase_requests.edit')) {
            return response()->json([
                'success' => false,
                'message' => 'You do not have permission to edit purchase requests'
            ], 403);
        }
        $pr = PurchaseRequest::findOrFail($id);

        // Check if already converted
        if ($pr->converted_to_po) {
            return response()->json([
                'success' => false,
                'message' => 'Cannot edit a purchase request that has been converted to PO'
            ], 400);
        }



        $validator = Validator::make($request->all(), [
            'purpose' => 'required|string',
            'required_by_date' => 'nullable|date|after:today',
            'priority' => 'in:LOW,NORMAL,HIGH,URGENT',
            'notes' => 'nullable|string',
            'items' => 'required|array|min:1',
            'items.*.item_type' => 'required|in:product,service',
            'items.*.product_id' => 'required_if:items.*.item_type,product|nullable|exists:products,id',
            'items.*.service_id' => 'required_if:items.*.item_type,service|nullable|exists:services,id',
            'items.*.quantity' => 'nullable|numeric|min:0',
            'items.*.uom_id' => 'nullable|exists:uoms,id',
            'deleted_items' => 'nullable|array',
            'deleted_items.*' => 'string|exists:purchase_request_items,id'
        ]);

        if ($validator->fails()) {
            Log::error('PR Update Validation Failed:', [
                'errors' => $validator->errors()->toArray()
            ]);
            return response()->json([
                'success' => false,
                'message' => 'Validation failed',
                'errors' => $validator->errors()
            ], 422);
        }

        DB::beginTransaction();
        try {
            // Update PR main data
            $pr->purpose = $request->purpose;
            $pr->required_by_date = $request->required_by_date;
            $pr->priority = $request->priority;
            $pr->notes = $request->notes;
            $pr->updated_by = Auth::id();
            $pr->save();

            // Delete removed items first
            if (!empty($request->deleted_items)) {

                PurchaseRequestItem::whereIn('id', $request->deleted_items)
                    ->where('pr_id', $pr->id)
                    ->delete();
            }

            // Track all item IDs that should be kept (both existing and new)
            $itemIdsToKeep = [];

            // Update/Create items
            foreach ($request->items as $index => $item) {


                if (!empty($item['id']) && $item['id'] !== null) {
                    // Update existing item


                    $existingItem = PurchaseRequestItem::where('id', $item['id'])
                        ->where('pr_id', $pr->id)
                        ->first();

                    if ($existingItem) {
                        $existingItem->update([
                            'item_type' => $item['item_type'],
                            'product_id' => $item['product_id'] ?? null,
                            'service_id' => $item['service_id'] ?? null,
                            'description' => $item['description'] ?? null,
                            'quantity' => $item['quantity'] ?? null,
                            'uom_id' => $item['uom_id'] ?? null,
                            'preferred_supplier_id' => $item['preferred_supplier_id'] ?? null,
                            'sort_order' => $index
                        ]);
                        $itemIdsToKeep[] = $item['id'];
                    }
                } else {


                    $newItem = PurchaseRequestItem::create([
                        'pr_id' => $pr->id,
                        'item_type' => $item['item_type'],
                        'product_id' => $item['product_id'] ?? null,
                        'service_id' => $item['service_id'] ?? null,
                        'description' => $item['description'] ?? null,
                        'quantity' => $item['quantity'] ?? null,
                        'uom_id' => $item['uom_id'] ?? null,
                        'preferred_supplier_id' => $item['preferred_supplier_id'] ?? null,
                        'sort_order' => $index
                    ]);

                    // Add the new item's ID to the keep list
                    $itemIdsToKeep[] = $newItem->id;
                }
            }

            // Delete any items that are not in the keep list
            if (!empty($itemIdsToKeep)) {
                $deletedCount = PurchaseRequestItem::where('pr_id', $pr->id)
                    ->whereNotIn('id', $itemIdsToKeep)
                    ->delete();
            }

            DB::commit();



            return response()->json([
                'success' => true,
                'message' => 'Purchase request updated successfully',
                'data' => $pr->load(['items.product', 'items.service', 'items.uom'])
            ], 200);
        } catch (\Exception $e) {
            DB::rollback();
            Log::error('PR Update failed:', [
                'pr_id' => $pr->id,
                'error' => $e->getMessage(),
                'trace' => $e->getTraceAsString()
            ]);

            return response()->json([
                'success' => false,
                'message' => 'Failed to update purchase request',
                'error' => $e->getMessage()
            ], 500);
        }
    }


    public function show($id)
    {

        try {
            $user = Auth::user();
            $permissions = [
                'can_edit_purchase_requests' => $user->can('purchase_requests.edit'),
                'can_delete_purchase_requests' => $user->can('purchase_requests.delete'),
                  'can_convert_purchase_requests' => $user->can('purchase.request.convert'),
            ];
            $pr = PurchaseRequest::with([
                'items' => function ($query) {
                    $query->with(['product', 'service', 'uom', 'preferredSupplier', 'purchaseOrderItem.purchaseOrder', 'conversions.supplier']);
                },
                'requester',
                'creator',
                'updater'
            ])->findOrFail($id);

            // Add supplier-specific conversion data to each item
            foreach ($pr->items as $item) {
                // Use the model's conversions relationship
                $item->converted_suppliers = $item->conversions->pluck('supplier_id')->toArray();
                $item->conversion_details = $item->conversions->map(function ($conv) {
                    return [
                        'supplier_id' => $conv->supplier_id,
                        'supplier_name' => $conv->supplier->name ?? 'Unknown',
                        'converted_at' => $conv->converted_at
                    ];
                });
            }

            // Add conversion statistics
            $totalItems = $pr->items->count();
            $convertedItems = $pr->items->filter(function ($item) {
                return $item->conversions->count() > 0;
            })->count();

            $pr->conversion_stats = [
                'total_items' => $totalItems,
                'converted_items' => $convertedItems,
                'unconverted_items' => $totalItems - $convertedItems,
                'conversion_percentage' => $totalItems > 0 ? round(($convertedItems / $totalItems) * 100, 2) : 0,
                'is_fully_converted' => $totalItems > 0 && $convertedItems === $totalItems,
                'is_partially_converted' => $convertedItems > 0 && $convertedItems < $totalItems
            ];

            // Group items by supplier for frontend
            $itemsBySupplier = [];
            foreach ($pr->items as $item) {
                $supplierId = $item->preferred_supplier_id ?: 'any';
                if (!isset($itemsBySupplier[$supplierId])) {
                    $itemsBySupplier[$supplierId] = [];
                }
                $itemsBySupplier[$supplierId][] = $item;
            }
            $pr->items_by_supplier = $itemsBySupplier;

            return response()->json([
                'success' => true,
                'data' => $pr,
                'permissions' => $permissions
            ]);
        } catch (\Exception $e) {
            return response()->json([
                'success' => false,
                'message' => 'Purchase request not found'
            ], 404);
        }
    }

    public function destroy($id)
    {
        if (!Auth::user()->can('purchase_requests.delete')) {
            return response()->json([
                'success' => false,
                'message' => 'You do not have permission to delete purchase requests'
            ], 403);
        }
        try {
            $pr = PurchaseRequest::findOrFail($id);

            // Check if already converted
            if ($pr->converted_to_po) {
                return response()->json([
                    'success' => false,
                    'message' => 'Cannot delete a purchase request that has been converted to PO'
                ], 400);
            }

            // Hard delete
            $pr->items()->delete();
            $pr->forceDelete();

            return response()->json([
                'success' => true,
                'message' => 'Purchase request deleted successfully'
            ]);
        } catch (\Exception $e) {
            return response()->json([
                'success' => false,
                'message' => 'Failed to delete purchase request',
                'error' => $e->getMessage()
            ], 500);
        }
    }


    // Helper method to get PRs ready for conversion
    public function getPRsForConversion(Request $request)
    {
        $validator = Validator::make($request->all(), [
            'pr_ids' => 'required|array|min:1',
            'pr_ids.*' => 'required|exists:purchase_requests,id'
        ]);

        if ($validator->fails()) {
            return response()->json([
                'success' => false,
                'message' => 'Validation failed',
                'errors' => $validator->errors()
            ], 422);
        }

        // Get non-converted PRs only
        $prs = PurchaseRequest::with(['items.product', 'items.service', 'items.uom', 'requester'])
            ->whereIn('id', $request->pr_ids)
            ->where('converted_to_po', false)
            ->get();

        return response()->json([
            'success' => true,
            'data' => $prs
        ]);
    }

    public function bulkConvertToPO(Request $request)
    {
        $validator = Validator::make($request->all(), [
            'conversions' => 'required|array|min:1',
            'conversions.*.pr_id' => 'required|exists:purchase_requests,id',
            'conversions.*.supplier_id' => 'required|exists:suppliers,id',
            'conversions.*.items' => 'required|array|min:1',
            'conversions.*.items.*.unit_price' => 'required|numeric|min:0',
            'conversions.*.items.*.tax_id' => 'nullable|exists:tax_master,id',
        ]);

        if ($validator->fails()) {
            return response()->json([
                'success' => false,
                'message' => 'Validation failed',
                'errors' => $validator->errors()
            ], 422);
        }

        DB::beginTransaction();
        try {
            $converted = 0;
            $failed = 0;
            $results = [];

            foreach ($request->conversions as $conversion) {
                $pr = PurchaseRequest::with('items')->find($conversion['pr_id']);

                if (!$pr) {
                    $failed++;
                    $results[] = [
                        'pr_id' => $conversion['pr_id'],
                        'success' => false,
                        'message' => 'Purchase request not found'
                    ];
                    continue;
                }

                // Check if already converted
                if ($pr->converted_to_po) {
                    $failed++;
                    $results[] = [
                        'pr_id' => $pr->id,
                        'pr_number' => $pr->pr_number,
                        'success' => false,
                        'message' => 'Already converted to PO'
                    ];
                    continue;
                }

                $converted++;

                $results[] = [
                    'pr_id' => $pr->id,
                    'pr_number' => $pr->pr_number,
                    'success' => true,
                    'message' => 'Successfully converted'
                ];
            }

            DB::commit();

            return response()->json([
                'success' => true,
                'message' => "Bulk conversion completed. Converted: {$converted}, Failed: {$failed}",
                'data' => [
                    'converted_count' => $converted,
                    'failed_count' => $failed,
                    'results' => $results
                ]
            ]);
        } catch (\Exception $e) {
            DB::rollback();
            return response()->json([
                'success' => false,
                'message' => 'Failed to process bulk conversion',
                'error' => $e->getMessage()
            ], 500);
        }
    }
    public function convertToPO($id, Request $request)
    {
        $pr = PurchaseRequest::with('items.conversions')->findOrFail($id);

        $totalItems = $pr->items->count();
        $convertedItems = $pr->items->filter(fn($i) => $i->conversions->isNotEmpty())->count();

        // Check if fully converted
        if ($pr->converted_to_po && $convertedItems === $totalItems) {
            return response()->json([
                'success' => false,
                'message' => 'All items in this Purchase Request have been converted to PO'
            ], 400);
        }

        $validator = Validator::make($request->all(), [
            'supplier_id' => 'required|exists:suppliers,id',
            'selected_items' => 'required|array|min:1',
            'items' => 'required|array|min:1',
            'items.*.pr_item_id' => 'required|exists:purchase_request_items,id',
            'items.*.unit_price' => 'required|numeric|min:0',
            'items.*.tax_id' => 'nullable|exists:tax_master,id',
            'items.*.discount_amount' => 'nullable|numeric|min:0'
        ]);

        if ($validator->fails()) {
            return response()->json([
                'success' => false,
                'message' => 'Validation failed',
                'errors' => $validator->errors()
            ], 422);
        }

        $selectedItemIds = $request->selected_items;
        $prItemIds = $pr->items->pluck('id')->toArray();

        // Validate selected items
        foreach ($selectedItemIds as $itemId) {
            if (!in_array($itemId, $prItemIds)) {
                return response()->json([
                    'success' => false,
                    'message' => 'Invalid item selected. Item does not belong to this PR.'
                ], 400);
            }

            $item = $pr->items->where('id', $itemId)->first();
            if ($item && $item->is_converted) {
                return response()->json([
                    'success' => false,
                    'message' => "Item has already been converted to a PO"
                ], 400);
            }
        }

        DB::beginTransaction();
        try {
            $poController = app(PurchaseOrderController::class);

            $poData = [
                'supplier_id' => $request->supplier_id,
                'pr_id' => $pr->id,
                'delivery_date' => $request->delivery_date ?? $pr->required_by_date,
                'quotation_ref' => $request->quotation_ref ?? null,
                'payment_terms' => $request->payment_terms ?? null,
                'terms_conditions' => $request->terms_conditions ?? null,
                'internal_notes' => $request->internal_notes ?? null,
                'other_charges' => $request->other_charges ?? 0,
                'items' => []
            ];

            $itemPricingMap = collect($request->items)->keyBy('pr_item_id');

            $itemsToConvert = [];

            foreach ($pr->items as $prItem) {
                if (!in_array($prItem->id, $selectedItemIds)) continue;

                if ($prItem->isConvertedForSupplierData($request->supplier_id)) continue;

                $pricingData = $itemPricingMap->get($prItem->id);
                if (!$pricingData) throw new \Exception("Pricing data missing for item ID: {$prItem->id}");

                $poData['items'][] = [
                    'pr_item_id' => $prItem->id,
                    'item_type' => $prItem->item_type,
                    'product_id' => $prItem->product_id,
                    'service_id' => $prItem->service_id,
                    'description' => $prItem->description,
                    'quantity' => $prItem->quantity ?? 1,
                    'uom_id' => $prItem->uom_id,
                    'unit_price' => $pricingData['unit_price'],
                    'tax_id' => $pricingData['tax_id'] ?? null,
                    'tax_percent' => $pricingData['tax_percent'] ?? 0,
                    'discount_amount' => $pricingData['discount_amount'] ?? 0
                ];

                $itemsToConvert[] = $prItem->id;
            }

            $po = $poController->createFromPR($poData);

            // Track conversions
            foreach ($po->items as $poItem) {
                if ($poItem->pr_item_id && in_array($poItem->pr_item_id, $itemsToConvert)) {
                    $conversion = PurchaseRequestItemConversion::firstOrCreate(
                        [
                            'pr_item_id' => $poItem->pr_item_id,
                            'supplier_id' => $request->supplier_id
                        ],
                        [
                            'po_item_id' => $poItem->id,
                            'converted_at' => now()
                        ]
                    );
                }
            }

            $prId = $pr->id;
            $supplierId = is_array($request->supplier_id) ? $request->supplier_id[0] : $request->supplier_id;
            $allItemsFullyConverted = $pr->items->every(function ($item) use ($supplierId) {
                return PurchaseRequestItemConversion::where([
                    'pr_item_id'  => $item->id,
                    'supplier_id' => $supplierId,
                ])->exists();
            });

            if ($allItemsFullyConverted) {
                // $pr->update([
                //     'converted_to_po' => true, 
                //     'partially_converted' => false,
                //     'last_po_id' => $po->id,
                //     'converted_at' => now(),
                //     'converted_by' => Auth::id()
                // ]);
            } else {
                $pr->update([
                    'converted_to_po' => false,
                    'partially_converted' => true,
                    'last_po_id' => $po->id,
                    'updated_by' => Auth::id(),
                    'converted_at' => now(),
                    'converted_by' => Auth::id()
                ]);
            }

            DB::commit();

            return response()->json([
                'success' => true,
                'message' => $allItemsFullyConverted
                    ? 'All selected items converted to PO successfully'
                    : "Partial conversion: " . count($itemsToConvert) . " items converted to PO",
                'data' => [
                    'pr' => $pr,
                    'po' => $po,
                    'conversion_stats' => [
                        'items_converted' => $itemsToConvert,
                        'total_items' => $totalItems,
                        'is_fully_converted' => $allItemsFullyConverted
                    ]
                ]
            ]);
        } catch (\Exception $e) {
            DB::rollback();

            Log::error('Failed to convert PR to PO', [
                'pr_id' => $pr->id,
                'error' => $e->getMessage(),
                'trace' => $e->getTraceAsString()
            ]);

            return response()->json([
                'success' => false,
                'message' => 'Failed to convert PR to PO',
                'error' => $e->getMessage()
            ], 500);
        }
    }
}
