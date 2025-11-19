<?php
// app/Models/ManufacturingOrder.php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Concerns\HasUuids;
use Illuminate\Database\Eloquent\Relations\BelongsTo;
use Illuminate\Database\Eloquent\Relations\HasMany;
use Illuminate\Support\Facades\DB;
use Carbon\Carbon;

class ManufacturingOrder extends Model
{
    use HasUuids;

    protected $table = 'manufacturing_orders';

    protected $fillable = [
        'order_number',
        'bom_master_id',
        'product_id',
        'quantity_to_produce',
        'uom_id',
        'quantity_produced',
        'status',
        'priority',
        'scheduled_date',
        'started_date',
        'completed_date',
        'warehouse_id',
        'batch_number',
        'quality_check_required',
        'quality_status',
        'quality_notes',
        'material_cost',
        'labor_cost',
        'overhead_cost',
        'total_cost',
        'notes',
        'cancellation_reason',
        'created_by',
        'validated_by',
        'validated_at',
        'started_by',
        'started_at',
        'completed_by',
        'completed_at',
        'cancelled_by',
        'cancelled_at',
        'quality_checked_by',
        'quality_checked_at'
    ];

    protected $casts = [
        'quantity_to_produce' => 'decimal:3',
        'quantity_produced' => 'decimal:3',
        'quality_check_required' => 'boolean',
        'material_cost' => 'decimal:2',
        'labor_cost' => 'decimal:2',
        'overhead_cost' => 'decimal:2',
        'total_cost' => 'decimal:2',
        'scheduled_date' => 'date',
        'started_date' => 'date',
        'completed_date' => 'date',
        'validated_at' => 'datetime',
        'started_at' => 'datetime',
        'completed_at' => 'datetime',
        'cancelled_at' => 'datetime',
        'quality_checked_at' => 'datetime'
    ];

    const STATUS_DRAFT = 'DRAFT';
    const STATUS_VALIDATED = 'VALIDATED';
    const STATUS_IN_PROGRESS = 'IN_PROGRESS';
    const STATUS_COMPLETED = 'COMPLETED';
    const STATUS_CANCELLED = 'CANCELLED';

    const PRIORITY_LOW = 'LOW';
    const PRIORITY_NORMAL = 'NORMAL';
    const PRIORITY_HIGH = 'HIGH';
    const PRIORITY_URGENT = 'URGENT';

    const QUALITY_PENDING = 'PENDING';
    const QUALITY_PASSED = 'PASSED';
    const QUALITY_FAILED = 'FAILED';

    /**
     * Boot method
     */
    protected static function boot()
    {
        parent::boot();

        static::creating(function ($model) {
            if (empty($model->order_number)) {
                $model->order_number = self::generateOrderNumber();
            }
            
            // Set default scheduled date to today if not provided
            if (!$model->scheduled_date) {
                $model->scheduled_date = now()->format('Y-m-d');
            }
            
            // Calculate costs from BOM
            if ($model->bom_master_id && !$model->material_cost) {
                $model->calculateCostsFromBom();
            }
        });
    }

    /**
     * Relationships
     */
    public function bomMaster(): BelongsTo
    {
        return $this->belongsTo(BomMaster::class, 'bom_master_id');
    }

    public function product(): BelongsTo
    {
        return $this->belongsTo(Product::class, 'product_id');
    }

    public function warehouse(): BelongsTo
    {
        return $this->belongsTo(Warehouse::class, 'warehouse_id');
    }

    public function uom(): BelongsTo
    {
        return $this->belongsTo(Uom::class, 'uom_id');
    }

    public function items(): HasMany
    {
        return $this->hasMany(ManufacturingOrderItem::class, 'manufacturing_order_id');
    }

    public function stockReservations(): HasMany
    {
        return $this->hasMany(ManufacturingStockReservation::class, 'manufacturing_order_id');
    }

    public function creator(): BelongsTo
    {
        return $this->belongsTo(User::class, 'created_by');
    }

    public function validator(): BelongsTo
    {
        return $this->belongsTo(User::class, 'validated_by');
    }

    public function starter(): BelongsTo
    {
        return $this->belongsTo(User::class, 'started_by');
    }

    public function completer(): BelongsTo
    {
        return $this->belongsTo(User::class, 'completed_by');
    }

    public function canceller(): BelongsTo
    {
        return $this->belongsTo(User::class, 'cancelled_by');
    }

    public function qualityChecker(): BelongsTo
    {
        return $this->belongsTo(User::class, 'quality_checked_by');
    }

    /**
     * Scopes
     */
    public function scopeActive($query)
    {
        return $query->whereNotIn('status', [self::STATUS_COMPLETED, self::STATUS_CANCELLED]);
    }

    public function scopeByStatus($query, $status)
    {
        return $query->where('status', $status);
    }

    public function scopeScheduledFor($query, $date)
    {
        return $query->whereDate('scheduled_date', $date);
    }

    public function scopeOverdue($query)
    {
        return $query->where('status', '!=', self::STATUS_COMPLETED)
            ->where('status', '!=', self::STATUS_CANCELLED)
            ->whereDate('scheduled_date', '<', now());
    }

    /**
     * Methods
     */
    
    /**
     * Generate unique order number
     */
    public static function generateOrderNumber(): string
    {
        $prefix = 'MO-' . date('Ymd');
        
        $lastOrder = self::where('order_number', 'LIKE', $prefix . '%')
            ->orderBy('order_number', 'desc')
            ->first();
        
        if ($lastOrder) {
            $lastNumber = intval(substr($lastOrder->order_number, -4));
            $newNumber = str_pad($lastNumber + 1, 4, '0', STR_PAD_LEFT);
        } else {
            $newNumber = '0001';
        }
        
        return $prefix . '-' . $newNumber;
    }

    /**
     * Generate batch number
     */
    public function generateBatchNumber(): string
    {
        $product = $this->product;
        $prefix = 'BATCH-' . ($product ? strtoupper(substr($product->product_code, 0, 3)) : 'XXX');
        $date = Carbon::now()->format('Ymd');
        
        $lastBatch = self::where('batch_number', 'LIKE', $prefix . '-' . $date . '%')
            ->orderBy('batch_number', 'desc')
            ->first();
        
        if ($lastBatch) {
            $lastNumber = intval(substr($lastBatch->batch_number, -3));
            $newNumber = str_pad($lastNumber + 1, 3, '0', STR_PAD_LEFT);
        } else {
            $newNumber = '001';
        }
        
        return $prefix . '-' . $date . '-' . $newNumber;
    }

    /**
     * Calculate costs from BOM
     */
    public function calculateCostsFromBom(): void
    {
        if (!$this->bomMaster) {
            return;
        }
        
        $bom = $this->bomMaster;
        $multiplier = $this->quantity_to_produce / $bom->output_quantity;
        
        // Calculate material cost based on current prices
        $materialCost = 0;
        foreach ($bom->details as $detail) {
            $detail->updateCostFromProduct();
            $materialCost += $detail->total_cost * $multiplier;
        }
        
        $this->material_cost = $materialCost;
        $this->labor_cost = $bom->labor_cost * $multiplier;
        $this->overhead_cost = $bom->overhead_cost * $multiplier;
        $this->total_cost = $this->material_cost + $this->labor_cost + $this->overhead_cost;
    }

    /**
     * Create order items from BOM
     */
    public function createItemsFromBom(): void
    {
        if (!$this->bomMaster) {
            return;
        }
        
        $bom = $this->bomMaster;
        $multiplier = $this->quantity_to_produce / $bom->output_quantity;
        
        foreach ($bom->details as $detail) {
            $requiredQuantity = $detail->quantity * $multiplier;
            
            ManufacturingOrderItem::create([
                'manufacturing_order_id' => $this->id,
                'raw_material_id' => $detail->raw_material_id,
                'required_quantity' => $requiredQuantity,
                'consumed_quantity' => 0,
                'uom_id' => $detail->uom_id,
                'unit_cost' => $detail->unit_cost,
                'total_cost' => $detail->unit_cost * $requiredQuantity,
                'status' => 'PENDING'
            ]);
        }
    }

    /**
     * Validate manufacturing order (check stock availability)
     */
    public function validate($userId = null): array
    {
        $result = [
            'success' => true,
            'messages' => [],
            'shortages' => []
        ];
        
        // Check if already validated
        if ($this->status !== self::STATUS_DRAFT) {
            $result['success'] = false;
            $result['messages'][] = 'Order is not in draft status';
            return $result;
        }
        
        // Check stock availability
        $availability = $this->checkStockAvailability();
        
        if (!$availability['available']) {
            $result['success'] = false;
            $result['messages'][] = 'Insufficient stock for some raw materials';
            $result['shortages'] = $availability['shortages'];
            return $result;
        }
        
        // Reserve stock
        $reserved = $this->reserveStock();
        
        if (!$reserved) {
            $result['success'] = false;
            $result['messages'][] = 'Failed to reserve stock';
            return $result;
        }
        
        // Update status
        $this->status = self::STATUS_VALIDATED;
        $this->validated_by = $userId ?? auth()->id();
        $this->validated_at = now();
        $this->save();
        
        // Update items status
        $this->items()->update(['status' => 'RESERVED']);
        
        $result['messages'][] = 'Order validated successfully';
        return $result;
    }

    /**
     * Check stock availability for all raw materials
     */
    public function checkStockAvailability(): array
    {
        $result = [
            'available' => true,
            'shortages' => []
        ];
        
        foreach ($this->items as $item) {
            // Convert to base UOM for stock checking
            $requiredInBaseUom = $this->convertToBaseUom($item->required_quantity, $item->uom_id);
            
            // Check stock balance
            $stockBalance = ProductStock::where('product_id', $item->raw_material_id)
                ->where('warehouse_id', $this->warehouse_id)
                ->first();
            
            $availableQuantity = $stockBalance 
                ? ($stockBalance->quantity - $stockBalance->reserved_quantity) 
                : 0;
            
            if ($availableQuantity < $requiredInBaseUom) {
                $result['available'] = false;
                $result['shortages'][] = [
                    'product_id' => $item->raw_material_id,
                    'product_name' => $item->rawMaterial->name,
                    'required_quantity' => $requiredInBaseUom,
                    'available_quantity' => $availableQuantity,
                    'shortage_quantity' => $requiredInBaseUom - $availableQuantity,
                    'uom' => $item->uom->name
                ];
            }
        }
        
        return $result;
    }

    /**
     * Reserve stock for manufacturing
     */
    public function reserveStock(): bool
    {
        DB::beginTransaction();
        try {
            foreach ($this->items as $item) {
                $requiredInBaseUom = $this->convertToBaseUom($item->required_quantity, $item->uom_id);
                
                // Get or create stock record
                $stockBalance = ProductStock::firstOrCreate(
                    [
                        'product_id' => $item->raw_material_id,
                        'warehouse_id' => $this->warehouse_id
                    ],
                    [
                        'quantity' => 0,
                        'reserved_quantity' => 0,
                        'created_by' => auth()->id()
                    ]
                );
                
                // Check availability again
                if (($stockBalance->quantity - $stockBalance->reserved_quantity) < $requiredInBaseUom) {
                    DB::rollback();
                    return false;
                }
                
                // Reserve stock
                $stockBalance->reserved_quantity += $requiredInBaseUom;
                $stockBalance->save();
                
                // Create reservation record
                ManufacturingStockReservation::create([
                    'manufacturing_order_id' => $this->id,
                    'product_id' => $item->raw_material_id,
                    'warehouse_id' => $this->warehouse_id,
                    'reserved_quantity' => $requiredInBaseUom,
                    'status' => 'RESERVED',
                    'reserved_at' => now(),
                    'reserved_by' => auth()->id()
                ]);
            }
            
            DB::commit();
            return true;
        } catch (\Exception $e) {
            DB::rollback();
            return false;
        }
    }

    /**
     * Release reserved stock
     */
    public function releaseReservedStock(): bool
    {
        DB::beginTransaction();
        try {
            $reservations = $this->stockReservations()->where('status', 'RESERVED')->get();
            
            foreach ($reservations as $reservation) {
                // Update stock balance
                $stockBalance = ProductStock::where('product_id', $reservation->product_id)
                    ->where('warehouse_id', $reservation->warehouse_id)
                    ->first();
                
                if ($stockBalance) {
                    $stockBalance->reserved_quantity = max(0, 
                        $stockBalance->reserved_quantity - $reservation->reserved_quantity
                    );
                    $stockBalance->save();
                }
                
                // Update reservation status
                $reservation->status = 'RELEASED';
                $reservation->released_at = now();
                $reservation->save();
            }
            
            // Update items status
            $this->items()->update(['status' => 'PENDING']);
            
            DB::commit();
            return true;
        } catch (\Exception $e) {
            DB::rollback();
            return false;
        }
    }

    /**
     * Start manufacturing
     */
    public function startManufacturing($userId = null): array
    {
        $result = [
            'success' => true,
            'messages' => []
        ];
        
        if ($this->status !== self::STATUS_VALIDATED) {
            $result['success'] = false;
            $result['messages'][] = 'Order must be validated before starting';
            return $result;
        }
        
        // Generate batch number if tracking batches
        $manufacturingSetting = ProductManufacturingSetting::where('product_id', $this->product_id)->first();
        if ($manufacturingSetting && $manufacturingSetting->track_batches) {
            $this->batch_number = $this->generateBatchNumber();
        }
        
        $this->status = self::STATUS_IN_PROGRESS;
        $this->started_by = $userId ?? auth()->id();
        $this->started_at = now();
        $this->started_date = now()->format('Y-m-d');
        $this->save();
        
        $result['messages'][] = 'Manufacturing started successfully';
        return $result;
    }

    /**
     * Complete manufacturing and perform stock movements
     */
    public function completeManufacturing($actualQuantityProduced = null, $userId = null): array
    {
        $result = [
            'success' => true,
            'messages' => [],
            'stock_movements' => []
        ];
        
        if ($this->status !== self::STATUS_IN_PROGRESS) {
            $result['success'] = false;
            $result['messages'][] = 'Order must be in progress to complete';
            return $result;
        }
        
        DB::beginTransaction();
        try {
            $quantityProduced = $actualQuantityProduced ?? $this->quantity_to_produce;
            
            // Check if quality check is required
            $manufacturingSetting = ProductManufacturingSetting::where('product_id', $this->product_id)->first();
            $requiresQualityCheck = $manufacturingSetting ? $manufacturingSetting->requires_quality_check : false;
            
            if ($this->quality_check_required || $requiresQualityCheck) {
                if (!$this->quality_status || $this->quality_status === self::QUALITY_PENDING) {
                    $result['success'] = false;
                    $result['messages'][] = 'Quality check is required before completion';
                    DB::rollback();
                    return $result;
                }
                
                if ($this->quality_status === self::QUALITY_FAILED) {
                    $result['success'] = false;
                    $result['messages'][] = 'Cannot complete order with failed quality check';
                    DB::rollback();
                    return $result;
                }
            }
            
            // Consume raw materials (Stock OUT)
            foreach ($this->items as $item) {
                $consumedQuantity = $this->convertToBaseUom($item->required_quantity, $item->uom_id);
                
                // Create stock movement for raw material consumption
                $stockMovement = StockMovement::create([
                    'id' => \Str::uuid(),
                    'movement_number' => $this->generateMovementNumber('OUT'),
                    'movement_type' => 'MANUFACTURING_OUT',
                    'product_id' => $item->raw_material_id,
                    'warehouse_id' => $this->warehouse_id,
                    'quantity' => $consumedQuantity,
                    'unit_cost' => $item->unit_cost,
                    'total_cost' => $item->total_cost,
                    'reference_type' => 'MANUFACTURING_ORDER',
                    'reference_id' => $this->id,
                    'notes' => 'Raw material consumed for ' . $this->order_number,
                    'created_by' => auth()->id(),
                    'created_at' => now()
                ]);
                
                // Update stock balance
                $stockBalance = ProductStock::where('product_id', $item->raw_material_id)
                    ->where('warehouse_id', $this->warehouse_id)
                    ->first();
                
                if ($stockBalance) {
                    $stockBalance->quantity -= $consumedQuantity;
                    $stockBalance->reserved_quantity = max(0, 
                        $stockBalance->reserved_quantity - $consumedQuantity
                    );
                    $stockBalance->save();
                }
                
                // Update item status
                $item->consumed_quantity = $item->required_quantity;
                $item->status = 'CONSUMED';
                $item->stock_movement_id = $stockMovement->id;
                $item->save();
                
                $result['stock_movements'][] = [
                    'type' => 'OUT',
                    'product' => $item->rawMaterial->name,
                    'quantity' => $consumedQuantity,
                    'movement_id' => $stockMovement->id
                ];
            }
            
            // Update stock reservations
            $this->stockReservations()->update([
                'status' => 'CONSUMED',
                'consumed_at' => now()
            ]);
            
            // Add manufactured product to stock (Stock IN)
            $productInQuantity = $this->convertToBaseUom($quantityProduced, $this->uom_id);
            
            // Calculate unit cost for manufactured product
            $unitCost = $this->total_cost / $quantityProduced;
            
            // Create stock movement for manufactured product
            $stockMovementIn = StockMovement::create([
                'id' => \Str::uuid(),
                'movement_number' => $this->generateMovementNumber('IN'),
                'movement_type' => 'MANUFACTURING_IN',
                'product_id' => $this->product_id,
                'warehouse_id' => $this->warehouse_id,
                'quantity' => $productInQuantity,
                'unit_cost' => $unitCost,
                'total_cost' => $this->total_cost,
                'batch_number' => $this->batch_number,
                'reference_type' => 'MANUFACTURING_ORDER',
                'reference_id' => $this->id,
                'notes' => 'Product manufactured from ' . $this->order_number,
                'created_by' => auth()->id(),
                'created_at' => now()
            ]);
            
            // Update or create stock balance for manufactured product
            $productStock = ProductStock::firstOrCreate(
                [
                    'product_id' => $this->product_id,
                    'warehouse_id' => $this->warehouse_id
                ],
                [
                    'quantity' => 0,
                    'reserved_quantity' => 0,
                    'created_by' => auth()->id()
                ]
            );
            
            // Update stock quantity
            $productStock->quantity += $productInQuantity;
            
            // Update average cost
            if ($productStock->quantity > 0) {
                $totalValue = ($productStock->avg_cost * ($productStock->quantity - $productInQuantity)) + 
                             ($unitCost * $productInQuantity);
                $productStock->avg_cost = $totalValue / $productStock->quantity;
            } else {
                $productStock->avg_cost = $unitCost;
            }
            
            $productStock->last_received_date = now();
            $productStock->save();
            
            // Create batch record if batch tracking is enabled
            if ($this->batch_number && $manufacturingSetting && $manufacturingSetting->track_batches) {
                ProductBatch::create([
                    'batch_number' => $this->batch_number,
                    'product_id' => $this->product_id,
                    'initial_quantity' => $productInQuantity,
                    'current_quantity' => $productInQuantity,
                    'cost_price' => $unitCost,
                    'warehouse_id' => $this->warehouse_id,
                    'status' => 'ACTIVE',
                    'created_by' => auth()->id()
                ]);
            }
            
            // Create cost history record
            ManufacturingCostHistory::create([
                'manufacturing_order_id' => $this->id,
                'product_id' => $this->product_id,
                'quantity_produced' => $quantityProduced,
                'material_cost' => $this->material_cost,
                'labor_cost' => $this->labor_cost,
                'overhead_cost' => $this->overhead_cost,
                'total_cost' => $this->total_cost,
                'unit_cost' => $unitCost,
                'production_date' => now()
            ]);
            
            // Update order status
            $this->quantity_produced = $quantityProduced;
            $this->status = self::STATUS_COMPLETED;
            $this->completed_by = $userId ?? auth()->id();
            $this->completed_at = now();
            $this->completed_date = now()->format('Y-m-d');
            $this->save();
            
            $result['stock_movements'][] = [
                'type' => 'IN',
                'product' => $this->product->name,
                'quantity' => $productInQuantity,
                'movement_id' => $stockMovementIn->id
            ];
            
            $result['messages'][] = 'Manufacturing completed successfully';
            $result['messages'][] = sprintf(
                'Produced %s %s of %s',
                $quantityProduced,
                $this->uom->uom_short,
                $this->product->name
            );
            
            DB::commit();
            return $result;
        } catch (\Exception $e) {
            DB::rollback();
            $result['success'] = false;
            $result['messages'][] = 'Failed to complete manufacturing: ' . $e->getMessage();
            return $result;
        }
    }

    /**
     * Cancel manufacturing order
     */
    public function cancelOrder($reason, $userId = null): array
    {
        $result = [
            'success' => true,
            'messages' => []
        ];
        
        if (in_array($this->status, [self::STATUS_COMPLETED, self::STATUS_CANCELLED])) {
            $result['success'] = false;
            $result['messages'][] = 'Cannot cancel completed or already cancelled order';
            return $result;
        }
        
        DB::beginTransaction();
        try {
            // Release reserved stock if validated or in progress
            if (in_array($this->status, [self::STATUS_VALIDATED, self::STATUS_IN_PROGRESS])) {
                $this->releaseReservedStock();
            }
            
            // Update status
            $this->status = self::STATUS_CANCELLED;
            $this->cancellation_reason = $reason;
            $this->cancelled_by = $userId ?? auth()->id();
            $this->cancelled_at = now();
            $this->save();
            
            $result['messages'][] = 'Order cancelled successfully';
            
            DB::commit();
            return $result;
        } catch (\Exception $e) {
            DB::rollback();
            $result['success'] = false;
            $result['messages'][] = 'Failed to cancel order: ' . $e->getMessage();
            return $result;
        }
    }

    /**
     * Perform quality check
     */
    public function performQualityCheck($status, $notes = null, $userId = null): bool
    {
        if (!in_array($status, [self::QUALITY_PASSED, self::QUALITY_FAILED])) {
            return false;
        }
        
        $this->quality_status = $status;
        $this->quality_notes = $notes;
        $this->quality_checked_by = $userId ?? auth()->id();
        $this->quality_checked_at = now();
        
        return $this->save();
    }

    /**
     * Convert quantity to base UOM
     */
    private function convertToBaseUom($quantity, $uomId): float
    {
        $uom = Uom::find($uomId);
        if (!$uom) return $quantity;
        
        // If it's already base unit
        if (!$uom->base_unit) {
            return $quantity;
        }
        
        // Convert to base unit
        return $quantity * $uom->conversion_factor;
    }

    /**
     * Generate stock movement number
     */
    private function generateMovementNumber($type): string
    {
        $prefix = 'SM-' . $type . '-' . date('Ymd');
        
        $lastMovement = StockMovement::where('movement_number', 'LIKE', $prefix . '%')
            ->orderBy('movement_number', 'desc')
            ->first();
        
        if ($lastMovement) {
            $lastNumber = intval(substr($lastMovement->movement_number, -4));
            $newNumber = str_pad($lastNumber + 1, 4, '0', STR_PAD_LEFT);
        } else {
            $newNumber = '0001';
        }
        
        return $prefix . '-' . $newNumber;
    }

    /**
     * Get status color
     */
    public function getStatusColor(): string
    {
        return match($this->status) {
            self::STATUS_DRAFT => 'secondary',
            self::STATUS_VALIDATED => 'info',
            self::STATUS_IN_PROGRESS => 'warning',
            self::STATUS_COMPLETED => 'success',
            self::STATUS_CANCELLED => 'danger',
            default => 'secondary'
        };
    }

    /**
     * Get priority color
     */
    public function getPriorityColor(): string
    {
        return match($this->priority) {
            self::PRIORITY_LOW => 'secondary',
            self::PRIORITY_NORMAL => 'primary',
            self::PRIORITY_HIGH => 'warning',
            self::PRIORITY_URGENT => 'danger',
            default => 'secondary'
        };
    }

    /**
     * Check if can be edited
     */
    public function canBeEdited(): bool
    {
        return $this->status === self::STATUS_DRAFT;
    }

    /**
     * Check if can be validated
     */
    public function canBeValidated(): bool
    {
        return $this->status === self::STATUS_DRAFT;
    }

    /**
     * Check if can be started
     */
    public function canBeStarted(): bool
    {
        return $this->status === self::STATUS_VALIDATED;
    }

    /**
     * Check if can be completed
     */
    public function canBeCompleted(): bool
    {
        return $this->status === self::STATUS_IN_PROGRESS;
    }

    /**
     * Check if can be cancelled
     */
    public function canBeCancelled(): bool
    {
        return !in_array($this->status, [self::STATUS_COMPLETED, self::STATUS_CANCELLED]);
    }
}