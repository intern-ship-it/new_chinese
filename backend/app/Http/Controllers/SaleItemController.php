<?php

namespace App\Http\Controllers;

use App\Http\Controllers\Controller;
use App\Models\SaleItem;
use App\Models\SaleItemBomProduct;
use App\Models\SaleItemCommission;
use App\Models\Product;
use App\Services\S3UploadService;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Validator;
use Illuminate\Support\Facades\Log;
use Illuminate\Support\Str;
use Carbon\Carbon;
use Exception;

class SaleItemController extends Controller
{
    protected $s3UploadService;

    public function __construct(S3UploadService $s3UploadService)
    {
        $this->s3UploadService = $s3UploadService;
    }

    /**
     * Display a listing of sale items
     */
    public function index(Request $request)
    {
        try {
            $query = SaleItem::with(['categories', 'sessions', 'deities', 'ledger']);

            // Filter by status
            if ($request->has('status')) {
                $query->where('status', $request->boolean('status'));
            }

            // Filter by sale type
            if ($request->has('sale_type')) {
                $query->where('sale_type', $request->sale_type);
            }

            // Filter by category
            if ($request->has('category_id')) {
                $query->whereHas('categories', function($q) use ($request) {
                    $q->where('sale_category_id', $request->category_id);
                });
            }

            // Search filter
            if ($request->has('search')) {
                $search = $request->search;
                $query->where(function ($q) use ($search) {
                    $q->where('name_primary', 'ILIKE', "%{$search}%")
                      ->orWhere('name_secondary', 'ILIKE', "%{$search}%")
                      ->orWhere('short_code', 'ILIKE', "%{$search}%");
                });
            }

            // Order by
            $query->orderBy('name_primary', 'asc');

            $items = $query->get();

            // Generate signed URLs for images
            $items->transform(function($item) {
                if ($item->image_url && !Str::startsWith($item->image_url, 'http')) {
                    $item->image_signed_url = $this->s3UploadService->getSignedUrl($item->image_url);
                } else {
                    $item->image_signed_url = $item->image_url;
                }
                
                if ($item->grayscale_image_url && !Str::startsWith($item->grayscale_image_url, 'http')) {
                    $item->grayscale_image_signed_url = $this->s3UploadService->getSignedUrl($item->grayscale_image_url);
                } else {
                    $item->grayscale_image_signed_url = $item->grayscale_image_url;
                }
                
                return $item;
            });

            return response()->json([
                'success' => true,
                'data' => $items
            ]);
        } catch (Exception $e) {
            return response()->json([
                'success' => false,
                'message' => 'Failed to fetch sale items',
                'error' => $e->getMessage()
            ], 500);
        }
    }

    /**
     * Get all active sale items
     */
    public function active()
    {
        try {
            $items = SaleItem::active()
                ->with(['categories', 'sessions', 'deities', 'ledger'])
                ->orderBy('name_primary', 'asc')
                ->get();

            // Generate signed URLs for images
            $items->transform(function($item) {
                if ($item->image_url && !Str::startsWith($item->image_url, 'http')) {
                    $item->image_signed_url = $this->s3UploadService->getSignedUrl($item->image_url);
                } else {
                    $item->image_signed_url = $item->image_url;
                }
                
                if ($item->grayscale_image_url && !Str::startsWith($item->grayscale_image_url, 'http')) {
                    $item->grayscale_image_signed_url = $this->s3UploadService->getSignedUrl($item->grayscale_image_url);
                } else {
                    $item->grayscale_image_signed_url = $item->grayscale_image_url;
                }
                
                return $item;
            });

            return response()->json([
                'success' => true,
                'data' => $items
            ]);
        } catch (Exception $e) {
            return response()->json([
                'success' => false,
                'message' => 'Failed to fetch active sale items',
                'error' => $e->getMessage()
            ], 500);
        }
    }

    /**
     * Get a single sale item by ID
     */
    public function show($id)
    {
        try {
            $item = SaleItem::with(['categories', 'sessions', 'deities', 'ledger', 'bomProducts.product', 'commissions.staff'])
                ->findOrFail($id);

            // Generate signed URLs for images
            if ($item->image_url && !Str::startsWith($item->image_url, 'http')) {
                $item->image_signed_url = $this->s3UploadService->getSignedUrl($item->image_url);
            } else {
                $item->image_signed_url = $item->image_url;
            }
            
            if ($item->grayscale_image_url && !Str::startsWith($item->grayscale_image_url, 'http')) {
                $item->grayscale_image_signed_url = $this->s3UploadService->getSignedUrl($item->grayscale_image_url);
            } else {
                $item->grayscale_image_signed_url = $item->grayscale_image_url;
            }

            return response()->json([
                'success' => true,
                'data' => $item
            ]);
        } catch (Exception $e) {
            return response()->json([
                'success' => false,
                'message' => 'Sale item not found',
                'error' => $e->getMessage()
            ], 404);
        }
    }

    /**
     * Store a newly created sale item
     */
    public function store(Request $request)
    {
        $validator = Validator::make($request->all(), [
            'name_primary' => 'required|string|max:255',
            'name_secondary' => 'nullable|string|max:255',
            'description' => 'nullable|string',
            'short_code' => 'required|string|max:50|unique:sale_items,short_code',
            'ledger_id' => 'nullable|exists:ledgers,id',
            'sale_type' => 'required|in:General,Vehicle,Token,Special',
            'price' => 'required|numeric|min:0',
            'special_price' => 'nullable|numeric|min:0',
            'image_url' => 'nullable|string|max:500',
            'grayscale_image_url' => 'nullable|string|max:500',
            'image_base64' => 'nullable|string',
            'grayscale_image_base64' => 'nullable|string',
            'status' => 'boolean',
            'is_inventory' => 'boolean',
            'is_commission' => 'boolean',
            'categories' => 'nullable|array',
            'categories.*' => 'exists:sale_categories,id',
            'sessions' => 'nullable|array',
            'sessions.*' => 'exists:sale_sessions,id',
            'deities' => 'nullable|array',
            'deities.*' => 'exists:deities,id',
            'bom_products' => 'nullable|array',
            'bom_products.*.product_id' => 'required|exists:products,id',
            'bom_products.*.quantity' => 'required|numeric|min:0.001',
            'commissions' => 'nullable|array',
            'commissions.*.staff_id' => 'required|exists:staff,id',
            'commissions.*.commission_percent' => 'required|numeric|min:0|max:100',
        ]);

        if ($validator->fails()) {
            return response()->json([
                'success' => false,
                'message' => 'Validation failed',
                'errors' => $validator->errors()
            ], 422);
        }

        // Validate total commission doesn't exceed 100%
        if ($request->has('commissions') && $request->is_commission) {
            $totalCommission = collect($request->commissions)->sum('commission_percent');
            if ($totalCommission > 100) {
                return response()->json([
                    'success' => false,
                    'message' => 'Total commission cannot exceed 100%',
                    'errors' => ['commissions' => ["Total commission is {$totalCommission}%. Maximum allowed is 100%."]]
                ], 422);
            }
        }

        try {
            DB::beginTransaction();

            // Handle image uploads
            $imageUrl = $request->image_url;
            $grayscaleImageUrl = $request->grayscale_image_url;
            $templeId = $request->header('X-Temple-ID') ?? session('temple_id');

            // Upload main image if base64 provided
            if ($request->has('image_base64') && $request->image_base64) {
                $uploadResult = $this->uploadBase64Image(
                    $request->image_base64, 
                    'sale-items', 
                    'image',
                    $templeId
                );
                
                if ($uploadResult['success']) {
                    $imageUrl = $uploadResult['path'];
                    Log::info('Sale item image uploaded', ['path' => $imageUrl]);
                } else {
                    throw new Exception('Failed to upload image: ' . $uploadResult['message']);
                }
            }

            // Upload grayscale image if base64 provided
            if ($request->has('grayscale_image_base64') && $request->grayscale_image_base64) {
                $uploadResult = $this->uploadBase64Image(
                    $request->grayscale_image_base64, 
                    'sale-items', 
                    'grayscale',
                    $templeId
                );
                
                if ($uploadResult['success']) {
                    $grayscaleImageUrl = $uploadResult['path'];
                    Log::info('Sale item grayscale image uploaded', ['path' => $grayscaleImageUrl]);
                } else {
                    throw new Exception('Failed to upload grayscale image: ' . $uploadResult['message']);
                }
            }

            // Create sale item
            $item = SaleItem::create([
                'name_primary' => $request->name_primary,
                'name_secondary' => $request->name_secondary,
                'description' => $request->description,
                'short_code' => strtoupper($request->short_code),
                'ledger_id' => $request->ledger_id,
                'sale_type' => $request->sale_type,
                'price' => $request->price,
                'special_price' => $request->special_price,
                'image_url' => $imageUrl,
                'grayscale_image_url' => $grayscaleImageUrl,
                'status' => $request->boolean('status', true),
                'is_inventory' => $request->boolean('is_inventory', false),
                'is_commission' => $request->boolean('is_commission', false),
                'created_by' => $request->user()->id ?? null,
            ]);

            // Attach categories
            if ($request->has('categories')) {
                $item->categories()->sync($request->categories);
            }

            // Attach sessions
            if ($request->has('sessions')) {
                $item->sessions()->sync($request->sessions);
            }

            // Attach deities
            if ($request->has('deities')) {
                $item->deities()->sync($request->deities);
            }

            // Add BOM products
            if ($request->has('bom_products') && $request->is_inventory) {
                foreach ($request->bom_products as $bomProduct) {
                    SaleItemBomProduct::create([
                        'sale_item_id' => $item->id,
                        'product_id' => $bomProduct['product_id'],
                        'quantity' => $bomProduct['quantity'],
                    ]);
                }
            }

            // Add commissions
            if ($request->has('commissions') && $request->is_commission) {
                foreach ($request->commissions as $commission) {
                    SaleItemCommission::create([
                        'sale_item_id' => $item->id,
                        'staff_id' => $commission['staff_id'],
                        'commission_percent' => $commission['commission_percent'],
                    ]);
                }
            }

            DB::commit();

            // Load relationships
            $item->load(['categories', 'sessions', 'deities', 'ledger', 'bomProducts.product', 'commissions.staff']);

            // Add signed URLs
            if ($item->image_url) {
                $item->image_signed_url = $this->s3UploadService->getSignedUrl($item->image_url);
            }
            if ($item->grayscale_image_url) {
                $item->grayscale_image_signed_url = $this->s3UploadService->getSignedUrl($item->grayscale_image_url);
            }

            return response()->json([
                'success' => true,
                'message' => 'Sale item created successfully',
                'data' => $item
            ], 201);
        } catch (Exception $e) {
            DB::rollBack();
            Log::error('Failed to create sale item', [
                'error' => $e->getMessage(),
                'trace' => $e->getTraceAsString()
            ]);
            return response()->json([
                'success' => false,
                'message' => 'Failed to create sale item',
                'error' => $e->getMessage()
            ], 500);
        }
    }

    /**
     * Update the specified sale item
     */
    public function update(Request $request, $id)
    {
        $validator = Validator::make($request->all(), [
            'name_primary' => 'required|string|max:255',
            'name_secondary' => 'nullable|string|max:255',
            'description' => 'nullable|string',
            'short_code' => 'required|string|max:50|unique:sale_items,short_code,' . $id,
            'ledger_id' => 'nullable|exists:ledgers,id',
            'sale_type' => 'required|in:General,Vehicle,Token,Special',
            'price' => 'required|numeric|min:0',
            'special_price' => 'nullable|numeric|min:0',
            'image_url' => 'nullable|string|max:500',
            'grayscale_image_url' => 'nullable|string|max:500',
            'image_base64' => 'nullable|string',
            'grayscale_image_base64' => 'nullable|string',
            'remove_image' => 'nullable|boolean',
            'remove_grayscale_image' => 'nullable|boolean',
            'status' => 'boolean',
            'is_inventory' => 'boolean',
            'is_commission' => 'boolean',
            'categories' => 'nullable|array',
            'categories.*' => 'exists:sale_categories,id',
            'sessions' => 'nullable|array',
            'sessions.*' => 'exists:sale_sessions,id',
            'deities' => 'nullable|array',
            'deities.*' => 'exists:deities,id',
            'bom_products' => 'nullable|array',
            'bom_products.*.product_id' => 'required|exists:products,id',
            'bom_products.*.quantity' => 'required|numeric|min:0.001',
            'commissions' => 'nullable|array',
            'commissions.*.staff_id' => 'required|exists:staff,id',
            'commissions.*.commission_percent' => 'required|numeric|min:0|max:100',
        ]);

        if ($validator->fails()) {
            return response()->json([
                'success' => false,
                'message' => 'Validation failed',
                'errors' => $validator->errors()
            ], 422);
        }

        // Validate total commission doesn't exceed 100%
        if ($request->has('commissions') && $request->is_commission) {
            $totalCommission = collect($request->commissions)->sum('commission_percent');
            if ($totalCommission > 100) {
                return response()->json([
                    'success' => false,
                    'message' => 'Total commission cannot exceed 100%',
                    'errors' => ['commissions' => ["Total commission is {$totalCommission}%. Maximum allowed is 100%."]]
                ], 422);
            }
        }

        try {
            DB::beginTransaction();

            $item = SaleItem::findOrFail($id);
            $templeId = $request->header('X-Temple-ID') ?? session('temple_id');

            // Store old image paths for potential deletion
            $oldImageUrl = $item->image_url;
            $oldGrayscaleImageUrl = $item->grayscale_image_url;

            // Handle image updates
            $imageUrl = $item->image_url;
            $grayscaleImageUrl = $item->grayscale_image_url;

            // Check if image should be removed
            if ($request->boolean('remove_image')) {
                // Delete old image from S3
                if ($oldImageUrl && !Str::startsWith($oldImageUrl, 'http')) {
                    $this->s3UploadService->deleteSignature($oldImageUrl);
                    Log::info('Deleted old sale item image', ['path' => $oldImageUrl]);
                }
                $imageUrl = null;
            }
            // Upload new image if base64 provided
            elseif ($request->has('image_base64') && $request->image_base64) {
                // Delete old image from S3 first
                if ($oldImageUrl && !Str::startsWith($oldImageUrl, 'http')) {
                    $this->s3UploadService->deleteSignature($oldImageUrl);
                    Log::info('Deleted old sale item image before upload', ['path' => $oldImageUrl]);
                }

                $uploadResult = $this->uploadBase64Image(
                    $request->image_base64, 
                    'sale-items', 
                    'image',
                    $templeId
                );
                
                if ($uploadResult['success']) {
                    $imageUrl = $uploadResult['path'];
                    Log::info('Sale item image uploaded', ['path' => $imageUrl]);
                } else {
                    throw new Exception('Failed to upload image: ' . $uploadResult['message']);
                }
            }

            // Check if grayscale image should be removed
            if ($request->boolean('remove_grayscale_image')) {
                // Delete old grayscale image from S3
                if ($oldGrayscaleImageUrl && !Str::startsWith($oldGrayscaleImageUrl, 'http')) {
                    $this->s3UploadService->deleteSignature($oldGrayscaleImageUrl);
                    Log::info('Deleted old sale item grayscale image', ['path' => $oldGrayscaleImageUrl]);
                }
                $grayscaleImageUrl = null;
            }
            // Upload new grayscale image if base64 provided
            elseif ($request->has('grayscale_image_base64') && $request->grayscale_image_base64) {
                // Delete old grayscale image from S3 first
                if ($oldGrayscaleImageUrl && !Str::startsWith($oldGrayscaleImageUrl, 'http')) {
                    $this->s3UploadService->deleteSignature($oldGrayscaleImageUrl);
                    Log::info('Deleted old sale item grayscale image before upload', ['path' => $oldGrayscaleImageUrl]);
                }

                $uploadResult = $this->uploadBase64Image(
                    $request->grayscale_image_base64, 
                    'sale-items', 
                    'grayscale',
                    $templeId
                );
                
                if ($uploadResult['success']) {
                    $grayscaleImageUrl = $uploadResult['path'];
                    Log::info('Sale item grayscale image uploaded', ['path' => $grayscaleImageUrl]);
                } else {
                    throw new Exception('Failed to upload grayscale image: ' . $uploadResult['message']);
                }
            }

            $item->update([
                'name_primary' => $request->name_primary,
                'name_secondary' => $request->name_secondary,
                'description' => $request->description,
                'short_code' => strtoupper($request->short_code),
                'ledger_id' => $request->ledger_id,
                'sale_type' => $request->sale_type,
                'price' => $request->price,
                'special_price' => $request->special_price,
                'image_url' => $imageUrl,
                'grayscale_image_url' => $grayscaleImageUrl,
                'status' => $request->boolean('status', true),
                'is_inventory' => $request->boolean('is_inventory', false),
                'is_commission' => $request->boolean('is_commission', false),
                'updated_by' => $request->user()->id ?? null,
            ]);

            // Sync categories
            if ($request->has('categories')) {
                $item->categories()->sync($request->categories);
            } else {
                $item->categories()->detach();
            }

            // Sync sessions
            if ($request->has('sessions')) {
                $item->sessions()->sync($request->sessions);
            } else {
                $item->sessions()->detach();
            }

            // Sync deities
            if ($request->has('deities')) {
                $item->deities()->sync($request->deities);
            } else {
                $item->deities()->detach();
            }

            // Update BOM products
            $item->bomProducts()->delete();
            if ($request->has('bom_products') && $request->is_inventory) {
                foreach ($request->bom_products as $bomProduct) {
                    SaleItemBomProduct::create([
                        'sale_item_id' => $item->id,
                        'product_id' => $bomProduct['product_id'],
                        'quantity' => $bomProduct['quantity'],
                    ]);
                }
            }

            // Update commissions
            $item->commissions()->delete();
            if ($request->has('commissions') && $request->is_commission) {
                foreach ($request->commissions as $commission) {
                    SaleItemCommission::create([
                        'sale_item_id' => $item->id,
                        'staff_id' => $commission['staff_id'],
                        'commission_percent' => $commission['commission_percent'],
                    ]);
                }
            }

            DB::commit();

            // Load relationships
            $item->load(['categories', 'sessions', 'deities', 'ledger', 'bomProducts.product', 'commissions.staff']);

            // Add signed URLs
            if ($item->image_url) {
                $item->image_signed_url = $this->s3UploadService->getSignedUrl($item->image_url);
            }
            if ($item->grayscale_image_url) {
                $item->grayscale_image_signed_url = $this->s3UploadService->getSignedUrl($item->grayscale_image_url);
            }

            return response()->json([
                'success' => true,
                'message' => 'Sale item updated successfully',
                'data' => $item
            ]);
        } catch (Exception $e) {
            DB::rollBack();
            Log::error('Failed to update sale item', [
                'error' => $e->getMessage(),
                'trace' => $e->getTraceAsString()
            ]);
            return response()->json([
                'success' => false,
                'message' => 'Failed to update sale item',
                'error' => $e->getMessage()
            ], 500);
        }
    }

    /**
     * Remove the specified sale item
     */
    public function destroy($id)
    {
        try {
            DB::beginTransaction();

            $item = SaleItem::findOrFail($id);
            
            // Delete images from S3
            if ($item->image_url && !Str::startsWith($item->image_url, 'http')) {
                $this->s3UploadService->deleteSignature($item->image_url);
                Log::info('Deleted sale item image on destroy', ['path' => $item->image_url]);
            }
            
            if ($item->grayscale_image_url && !Str::startsWith($item->grayscale_image_url, 'http')) {
                $this->s3UploadService->deleteSignature($item->grayscale_image_url);
                Log::info('Deleted sale item grayscale image on destroy', ['path' => $item->grayscale_image_url]);
            }
            
            // Delete related records (cascading)
            $item->categories()->detach();
            $item->sessions()->detach();
            $item->deities()->detach();
            $item->bomProducts()->delete();
            $item->commissions()->delete();
            
            $item->delete();

            DB::commit();

            return response()->json([
                'success' => true,
                'message' => 'Sale item deleted successfully'
            ]);
        } catch (Exception $e) {
            DB::rollBack();
            return response()->json([
                'success' => false,
                'message' => 'Failed to delete sale item',
                'error' => $e->getMessage()
            ], 500);
        }
    }

    /**
     * Upload base64 image to S3
     */
    protected function uploadBase64Image($base64Data, $folder, $type, $templeId)
    {
        try {
            // Generate unique file name
            $timestamp = Carbon::now()->format('YmdHis');
            $random = Str::random(6);
            $fileName = "{$type}_{$timestamp}_{$random}.png";
            
            // Determine mime type from base64 header
            $mimeType = 'image/png';
            if (preg_match('/^data:image\/(\w+);base64,/', $base64Data, $matches)) {
                $mimeType = 'image/' . $matches[1];
                $extension = $matches[1] === 'jpeg' ? 'jpg' : $matches[1];
                $fileName = "{$type}_{$timestamp}_{$random}.{$extension}";
            }
            
            // Use S3UploadService to upload
            $result = $this->s3UploadService->uploadSignature(
                $base64Data,
                $folder,       // Use folder as user_id placeholder
                $templeId,
                $type
            );
            
            return $result;
            
        } catch (Exception $e) {
            Log::error('Failed to upload base64 image', [
                'error' => $e->getMessage(),
                'type' => $type
            ]);
            
            return [
                'success' => false,
                'message' => $e->getMessage()
            ];
        }
    }

    /**
     * Get available products for BOM
     */
    public function getAvailableProducts(Request $request)
    {
        try {
            $query = DB::table('products as p')
                ->leftJoin('uoms as u', 'p.uom_id', '=', 'u.id')
                ->leftJoin('uoms as base_u', 'u.base_unit', '=', 'base_u.id')
                ->leftJoin('item_categories as c', 'p.category_id', '=', 'c.id')
                ->select(
                    'p.id',
                    'p.product_code',
                    'p.name',
                    'p.product_type',
                    'p.average_cost',
                    'p.unit_price',
                    'p.available_stock',
                    'p.current_stock',
                    'p.low_stock_alert',
                    'p.image_url',
                    'p.uom_id',
                    'u.name as uom_name',
                    'u.uom_short',
                    'u.base_unit',
                    'u.conversion_factor',
                    'base_u.id as base_uom_id',
                    'base_u.name as base_uom_name',
                    'base_u.uom_short as base_uom_short',
                    'c.category_name as category_name'
                )
                ->where('p.is_active', true)
                ->where('p.current_stock', '>', 0)
                ->orderBy('p.name');

            // Filter by product type if specified
            if ($request->has('product_type')) {
                $query->where('p.product_type', $request->product_type);
            }

            // Search filter
            if ($request->has('search')) {
                $search = $request->search;
                $query->where(function ($q) use ($search) {
                    $q->where('p.name', 'ILIKE', "%{$search}%")
                        ->orWhere('p.product_code', 'ILIKE', "%{$search}%");
                });
            }

            $products = $query->get();

            return response()->json([
                'success' => true,
                'data' => $products
            ]);
        } catch (Exception $e) {
            return response()->json([
                'success' => false,
                'message' => 'Failed to fetch products',
                'error' => $e->getMessage()
            ], 500);
        }
    }


    /**
 * Generate next available short code
 */
public function generateShortCode(Request $request)
{
    try {
        $prefix = $request->input('prefix', 'SI'); // SI = Sale Item
        
        // Get the last short code with this prefix
        $lastItem = SaleItem::where('short_code', 'LIKE', $prefix . '%')
            ->orderBy('short_code', 'desc')
            ->first();
        
        if ($lastItem) {
            // Extract the numeric part
            $lastNumber = (int) preg_replace('/[^0-9]/', '', $lastItem->short_code);
            $nextNumber = $lastNumber + 1;
        } else {
            $nextNumber = 1;
        }
        
        // Format with leading zeros (e.g., SI0001, SI0002)
        $shortCode = $prefix . str_pad($nextNumber, 4, '0', STR_PAD_LEFT);
        
        // Ensure uniqueness
        while (SaleItem::where('short_code', $shortCode)->exists()) {
            $nextNumber++;
            $shortCode = $prefix . str_pad($nextNumber, 4, '0', STR_PAD_LEFT);
        }
        
        return response()->json([
            'success' => true,
            'data' => [
                'short_code' => $shortCode
            ]
        ]);
    } catch (Exception $e) {
        return response()->json([
            'success' => false,
            'message' => 'Failed to generate short code',
            'error' => $e->getMessage()
        ], 500);
    }
}
}