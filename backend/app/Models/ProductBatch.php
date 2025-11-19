<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;
use Illuminate\Database\Eloquent\Relations\HasMany;
use Illuminate\Support\Str;
use Carbon\Carbon;

class ProductBatch extends Model
{
    protected $table = 'product_batches';
    
    public $incrementing = false;
    protected $keyType = 'string';
    
    protected $fillable = [
        'batch_number',
        'product_id',
        'manufacture_date',
        'expiry_date',
        'best_before_date',
        'initial_quantity',
        'current_quantity',
        'reserved_quantity',
        'quantity',
        'cost_price',
        'selling_price',
        'mrp',
        'supplier_id',
        'grn_id',
        'grn_item_id',
        'purchase_invoice_id',
        'warehouse_id',
        'rack_location',
        'bin_location',
        'quality_check_status',
        'quality_certificate_no',
        'quality_notes',
        'status',
        'is_active',
        'expiry_alert_days',
        'min_stock_alert',
        'barcode',
        'notes',
        'created_by',
        'updated_by'
    ];
    
    protected $casts = [
        'manufacture_date' => 'date:Y-m-d',
        'expiry_date' => 'date:Y-m-d',
        'best_before_date' => 'date:Y-m-d',
        'initial_quantity' => 'decimal:3',
        'current_quantity' => 'decimal:3',
        'reserved_quantity' => 'decimal:3',
        'cost_price' => 'decimal:2',
        'selling_price' => 'decimal:2',
        'mrp' => 'decimal:2',
        'is_active' => 'boolean',
        'expiry_alert_days' => 'integer',
        'min_stock_alert' => 'decimal:3'
    ];
    
    protected $appends = ['available_quantity', 'days_until_expiry', 'expiry_status', 'is_low_stock'];
    
    // Boot method to set UUID
    protected static function boot()
    {
        parent::boot();
        
        static::creating(function ($model) {
            if (empty($model->id)) {
                $model->id = Str::uuid()->toString();
            }
            
            // Generate batch number if not provided
            if (empty($model->batch_number)) {
                $model->batch_number = self::generateBatchNumber($model->product_id);
            }
            
            // Set initial quantity as current quantity if not set
            if (is_null($model->current_quantity)) {
                $model->current_quantity = $model->initial_quantity;
            }
        });
        
        static::updating(function ($model) {
            // Auto update status based on expiry
            if ($model->expiry_date && Carbon::parse($model->expiry_date)->isPast()) {
                $model->status = 'EXPIRED';
                $model->is_active = false;
            }
            
            // Update status if quantity is zero
            if ($model->current_quantity <= 0) {
                $model->status = 'FINISHED';
            }
        });
    }
    
    /**
     * Relationships
     */
    
    public function product(): BelongsTo
    {
        return $this->belongsTo(Product::class, 'product_id');
    }
    
    public function supplier(): BelongsTo
    {
        return $this->belongsTo(Supplier::class, 'supplier_id');
    }
    
    public function warehouse(): BelongsTo
    {
        return $this->belongsTo(Warehouse::class, 'warehouse_id');
    }
    
    public function grn(): BelongsTo
    {
        return $this->belongsTo(Grn::class, 'grn_id');
    }
    
    public function grnItem(): BelongsTo
    {
        return $this->belongsTo(GrnItem::class, 'grn_item_id');
    }
    
    public function purchaseInvoice(): BelongsTo
    {
        return $this->belongsTo(PurchaseInvoice::class, 'purchase_invoice_id');
    }
    
    public function movements(): HasMany
    {
        return $this->hasMany(BatchMovement::class, 'batch_id');
    }
    
    public function serialNumbers(): HasMany
    {
        return $this->hasMany(BatchSerialNumber::class, 'batch_id');
    }
    
    public function creator(): BelongsTo
    {
        return $this->belongsTo(User::class, 'created_by');
    }
    
    public function updater(): BelongsTo
    {
        return $this->belongsTo(User::class, 'updated_by');
    }
    
    /**
     * Accessors
     */
    
    public function getAvailableQuantityAttribute(): float
    {
        return $this->current_quantity - $this->reserved_quantity;
    }
    
    public function getDaysUntilExpiryAttribute(): ?int
    {
        if (!$this->expiry_date) {
            return null;
        }
        
        return Carbon::now()->diffInDays($this->expiry_date, false);
    }
    
    public function getExpiryStatusAttribute(): string
    {
        if (!$this->expiry_date) {
            return 'NO_EXPIRY';
        }
        
        $days = $this->days_until_expiry;
        
        if ($days < 0) {
            return 'EXPIRED';
        } elseif ($days <= 7) {
            return 'CRITICAL';
        } elseif ($days <= $this->expiry_alert_days) {
            return 'WARNING';
        }
        
        return 'OK';
    }
    
    public function getIsLowStockAttribute(): bool
    {
        return $this->current_quantity <= $this->min_stock_alert;
    }
    
    /**
     * Scopes
     */
    
    public function scopeActive($query)
    {
        return $query->where('is_active', true)
                    ->where('status', 'ACTIVE');
    }
    
    public function scopeAvailable($query)
    {
        return $query->active()
                    ->where('current_quantity', '>', 0)
                    ->whereRaw('current_quantity > reserved_quantity');
    }
    
    public function scopeExpired($query)
    {
        return $query->where('status', 'EXPIRED')
                    ->orWhere(function($q) {
                        $q->whereNotNull('expiry_date')
                          ->where('expiry_date', '<', Carbon::now());
                    });
    }
    
    public function scopeExpiring($query, $days = 30)
    {
        return $query->whereNotNull('expiry_date')
                    ->where('expiry_date', '>=', Carbon::now())
                    ->where('expiry_date', '<=', Carbon::now()->addDays($days));
    }
    
    public function scopeLowStock($query)
    {
        return $query->whereRaw('current_quantity <= min_stock_alert')
                    ->where('current_quantity', '>', 0);
    }
    
    public function scopeForProduct($query, $productId)
    {
        return $query->where('product_id', $productId);
    }
    
    public function scopeInWarehouse($query, $warehouseId)
    {
        return $query->where('warehouse_id', $warehouseId);
    }
    
    public function scopeFromSupplier($query, $supplierId)
    {
        return $query->where('supplier_id', $supplierId);
    }
    
    /**
     * Methods
     */
    
    /**
     * Generate batch number
     */
    public static function generateBatchNumber($productId): string
    {
        $product = Product::find($productId);
        $prefix = $product ? substr($product->code, 0, 3) : 'BAT';
        $date = Carbon::now()->format('Ymd');
        
        $lastBatch = self::where('batch_number', 'LIKE', $prefix . '-' . $date . '-%')
                        ->orderBy('batch_number', 'desc')
                        ->first();
        
        if ($lastBatch) {
            $lastNumber = intval(substr($lastBatch->batch_number, -4));
            $newNumber = str_pad($lastNumber + 1, 4, '0', STR_PAD_LEFT);
        } else {
            $newNumber = '0001';
        }
        
        return $prefix . '-' . $date . '-' . $newNumber;
    }
    
    /**
     * Check if batch has sufficient quantity
     */
    public function hasQuantity($quantity): bool
    {
        return $this->available_quantity >= $quantity;
    }
    
    /**
     * Reserve quantity for order
     */
    public function reserveQuantity($quantity): bool
    {
        if (!$this->hasQuantity($quantity)) {
            return false;
        }
        
        $this->reserved_quantity += $quantity;
        return $this->save();
    }
    
    /**
     * Release reserved quantity
     */
    public function releaseQuantity($quantity): bool
    {
        $this->reserved_quantity = max(0, $this->reserved_quantity - $quantity);
        return $this->save();
    }
    
    /**
     * Adjust batch quantity
     */
    public function adjustQuantity($quantity, $type = 'add', $reason = null): bool
    {
        $oldQuantity = $this->current_quantity;
        
        if ($type === 'add') {
            $this->current_quantity += $quantity;
        } else {
            if ($this->current_quantity < $quantity) {
                return false;
            }
            $this->current_quantity -= $quantity;
        }
        
        $saved = $this->save();
        
        if ($saved && $reason) {
            // Create movement record
            BatchMovement::create([
                'batch_id' => $this->id,
                'product_id' => $this->product_id,
                'movement_type' => $type === 'add' ? 'IN_ADJUSTMENT' : 'OUT_ADJUSTMENT',
                'quantity' => $quantity,
                'quantity_before' => $oldQuantity,
                'quantity_after' => $this->current_quantity,
                'notes' => $reason,
                'created_by' => auth()->id()
            ]);
        }
        
        return $saved;
    }
    
    /**
     * Add serial numbers to batch
     */
    public function addSerialNumbers(array $serialNumbers): bool
    {
        foreach ($serialNumbers as $serial) {
            BatchSerialNumber::create([
                'batch_id' => $this->id,
                'product_id' => $this->product_id,
                'serial_number' => $serial,
                'status' => 'AVAILABLE'
            ]);
        }
        
        return true;
    }
    
    /**
     * Get batch value
     */
    public function getTotalValue(): float
    {
        return $this->current_quantity * $this->cost_price;
    }
    
    /**
     * Get batch age in days
     */
    public function getAgeInDays(): int
    {
        if (!$this->manufacture_date) {
            return Carbon::parse($this->created_at)->diffInDays(Carbon::now());
        }
        
        return Carbon::parse($this->manufacture_date)->diffInDays(Carbon::now());
    }
    
    /**
     * Check if batch needs quality check
     */
    public function needsQualityCheck(): bool
    {
        return $this->quality_check_status === 'PENDING';
    }
    
    /**
     * Mark quality check complete
     */
    public function markQualityCheck($status, $certificateNo = null, $notes = null): bool
    {
        $this->quality_check_status = $status;
        $this->quality_certificate_no = $certificateNo;
        $this->quality_notes = $notes;
        
        if ($status === 'FAILED') {
            $this->status = 'DAMAGED';
            $this->is_active = false;
        }
        
        return $this->save();
    }
    
    /**
     * Get FIFO batches for a product
     */
    public static function getFifoBatches($productId, $requiredQuantity, $warehouseId = null)
    {
        $query = self::forProduct($productId)
                    ->available()
                    ->orderBy('manufacture_date')
                    ->orderBy('created_at');
        
        if ($warehouseId) {
            $query->inWarehouse($warehouseId);
        }
        
        $batches = [];
        $remainingQuantity = $requiredQuantity;
        
        foreach ($query->get() as $batch) {
            if ($remainingQuantity <= 0) {
                break;
            }
            
            $takeQuantity = min($batch->available_quantity, $remainingQuantity);
            
            $batches[] = [
                'batch' => $batch,
                'quantity' => $takeQuantity
            ];
            
            $remainingQuantity -= $takeQuantity;
        }
        
        return $remainingQuantity <= 0 ? $batches : null;
    }
    
    /**
     * Get FEFO (First Expired First Out) batches
     */
    public static function getFefoBatches($productId, $requiredQuantity, $warehouseId = null)
    {
        $query = self::forProduct($productId)
                    ->available()
                    ->orderBy('expiry_date')
                    ->orderBy('created_at');
        
        if ($warehouseId) {
            $query->inWarehouse($warehouseId);
        }
        
        $batches = [];
        $remainingQuantity = $requiredQuantity;
        
        foreach ($query->get() as $batch) {
            if ($remainingQuantity <= 0) {
                break;
            }
            
            $takeQuantity = min($batch->available_quantity, $remainingQuantity);
            
            $batches[] = [
                'batch' => $batch,
                'quantity' => $takeQuantity
            ];
            
            $remainingQuantity -= $takeQuantity;
        }
        
        return $remainingQuantity <= 0 ? $batches : null;
    }
}