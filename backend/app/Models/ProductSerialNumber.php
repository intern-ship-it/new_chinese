<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;
use Illuminate\Database\Eloquent\Relations\HasMany;
use Illuminate\Support\Str;

class ProductSerialNumber extends Model
{
    protected $table = 'product_serial_numbers';
    
    protected $keyType = 'string';
    public $incrementing = false;
    
    protected $fillable = [
        'product_id',
        'serial_number',
        'grn_id',
        'grn_item_id',
        'purchase_invoice_id',
        'supplier_id',
        'batch_number',
        'manufacture_date',
        'expiry_date',
        'warranty_months',
        'warranty_end_date',
        'status',
        'current_warehouse_id',
        'current_location',
        'sales_invoice_id',
        'sold_date',
        'sold_to_customer_id',
        'sale_price',
        'condition_status',
        'last_inspection_date',
        'inspection_notes',
        'is_active',
        'notes',
        'custom_attributes',
        'created_by',
        'updated_by'
    ];
    
    protected $casts = [
        'manufacture_date' => 'date:Y-m-d',
        'expiry_date' => 'date:Y-m-d',
        'warranty_end_date' => 'date:Y-m-d',
        'sold_date' => 'date:Y-m-d',
        'last_inspection_date' => 'date:Y-m-d',
        'warranty_months' => 'integer',
        'sale_price' => 'decimal:2',
        'is_active' => 'boolean',
        'custom_attributes' => 'array',
        'created_at' => 'datetime',
        'updated_at' => 'datetime'
    ];
    
    // Status constants
    const STATUS_AVAILABLE = 'AVAILABLE';
    const STATUS_SOLD = 'SOLD';
    const STATUS_DAMAGED = 'DAMAGED';
    const STATUS_RETURNED = 'RETURNED';
    const STATUS_LOST = 'LOST';
    const STATUS_EXPIRED = 'EXPIRED';
    const STATUS_DISPOSED = 'DISPOSED';
    const STATUS_RESERVED = 'RESERVED';
    
    // Condition constants
    const CONDITION_GOOD = 'GOOD';
    const CONDITION_REFURBISHED = 'REFURBISHED';
    const CONDITION_DAMAGED = 'DAMAGED';
    const CONDITION_DEFECTIVE = 'DEFECTIVE';
    
    /**
     * Boot function from Laravel
     */
    protected static function boot()
    {
        parent::boot();
        
        static::creating(function ($model) {
            if (!$model->id) {
                $model->id = (string) Str::uuid();
            }
        });
    }
    
    /**
     * Get the product
     */
    public function product(): BelongsTo
    {
        return $this->belongsTo(Product::class, 'product_id');
    }
    
    /**
     * Get the GRN
     */
    public function grn(): BelongsTo
    {
        return $this->belongsTo(Grn::class, 'grn_id');
    }
    
    /**
     * Get the GRN item
     */
    public function grnItem(): BelongsTo
    {
        return $this->belongsTo(GrnItem::class, 'grn_item_id');
    }
    
    /**
     * Get the purchase invoice
     */
    public function purchaseInvoice(): BelongsTo
    {
        return $this->belongsTo(PurchaseInvoice::class, 'purchase_invoice_id');
    }
    
    /**
     * Get the supplier
     */
    public function supplier(): BelongsTo
    {
        return $this->belongsTo(Supplier::class, 'supplier_id');
    }
    
    /**
     * Get the current warehouse
     */
    public function currentWarehouse(): BelongsTo
    {
        return $this->belongsTo(Warehouse::class, 'current_warehouse_id');
    }
    
    /**
     * Get the sales invoice (if sold)
     */
    public function salesInvoice(): BelongsTo
    {
        return $this->belongsTo(SalesInvoice::class, 'sales_invoice_id');
    }
    
    /**
     * Get the customer (if sold)
     */
    public function customer(): BelongsTo
    {
        return $this->belongsTo(Customer::class, 'sold_to_customer_id');
    }
    
    /**
     * Get the creator
     */
    public function creator(): BelongsTo
    {
        return $this->belongsTo(User::class, 'created_by');
    }
    
    /**
     * Get the updater
     */
    public function updater(): BelongsTo
    {
        return $this->belongsTo(User::class, 'updated_by');
    }
    
    /**
     * Get movement history
     */
    public function movements(): HasMany
    {
        return $this->hasMany(SerialNumberMovement::class, 'serial_number_id')
            ->orderBy('movement_date', 'desc');
    }
    
    /**
     * Scope for available serial numbers
     */
    public function scopeAvailable($query)
    {
        return $query->where('status', self::STATUS_AVAILABLE)
            ->where('is_active', true);
    }
    
    /**
     * Scope for sold serial numbers
     */
    public function scopeSold($query)
    {
        return $query->where('status', self::STATUS_SOLD);
    }
    
    /**
     * Scope for serial numbers in a specific warehouse
     */
    public function scopeInWarehouse($query, $warehouseId)
    {
        return $query->where('current_warehouse_id', $warehouseId);
    }
    
    /**
     * Scope for serial numbers by product
     */
    public function scopeForProduct($query, $productId)
    {
        return $query->where('product_id', $productId);
    }
    
    /**
     * Scope for serial numbers with active warranty
     */
    public function scopeWithActiveWarranty($query)
    {
        return $query->where('warranty_end_date', '>=', now());
    }
    
    /**
     * Scope for serial numbers with expiring warranty (within 30 days)
     */
    public function scopeWithExpiringWarranty($query, $days = 30)
    {
        return $query->whereBetween('warranty_end_date', [
            now(),
            now()->addDays($days)
        ]);
    }
    
    /**
     * Scope for expired products
     */
    public function scopeExpired($query)
    {
        return $query->where('expiry_date', '<', now())
            ->orWhere('status', self::STATUS_EXPIRED);
    }
    
    /**
     * Check if warranty is active
     */
    public function hasActiveWarranty(): bool
    {
        if (!$this->warranty_end_date) {
            return false;
        }
        
        return $this->warranty_end_date->isFuture();
    }
    
    /**
     * Check if product is expired
     */
    public function isExpired(): bool
    {
        if (!$this->expiry_date) {
            return false;
        }
        
        return $this->expiry_date->isPast() || $this->status === self::STATUS_EXPIRED;
    }
    
    /**
     * Check if available for sale
     */
    public function isAvailable(): bool
    {
        return $this->status === self::STATUS_AVAILABLE && 
               $this->is_active && 
               !$this->isExpired();
    }
    
    /**
     * Mark as sold
     */
    public function markAsSold($salesInvoiceId, $customerId, $salePrice, $soldDate = null)
    {
        $this->update([
            'status' => self::STATUS_SOLD,
            'sales_invoice_id' => $salesInvoiceId,
            'sold_to_customer_id' => $customerId,
            'sale_price' => $salePrice,
            'sold_date' => $soldDate ?? now()
        ]);
        
        // Log movement
        $this->logMovement('SOLD', [
            'reference_type' => 'SALES_INVOICE',
            'reference_id' => $salesInvoiceId
        ]);
    }
    
    /**
     * Mark as damaged
     */
    public function markAsDamaged($reason = null, $notes = null)
    {
        $this->update([
            'status' => self::STATUS_DAMAGED,
            'condition_status' => self::CONDITION_DAMAGED,
            'inspection_notes' => $notes
        ]);
        
        // Log movement
        $this->logMovement('DAMAGED', [
            'reason' => $reason,
            'notes' => $notes
        ]);
    }
    
    /**
     * Transfer to another warehouse
     */
    public function transferToWarehouse($warehouseId, $location = null, $reason = null)
    {
        $oldWarehouseId = $this->current_warehouse_id;
        $oldLocation = $this->current_location;
        
        $this->update([
            'current_warehouse_id' => $warehouseId,
            'current_location' => $location
        ]);
        
        // Log movement
        $this->logMovement('TRANSFERRED', [
            'from_warehouse_id' => $oldWarehouseId,
            'to_warehouse_id' => $warehouseId,
            'from_location' => $oldLocation,
            'to_location' => $location,
            'reason' => $reason
        ]);
    }
    
    /**
     * Reserve serial number
     */
    public function reserve($referenceType = null, $referenceId = null)
    {
        $this->update([
            'status' => self::STATUS_RESERVED
        ]);
        
        // Log movement
        $this->logMovement('RESERVED', [
            'reference_type' => $referenceType,
            'reference_id' => $referenceId
        ]);
    }
    
    /**
     * Release reservation
     */
    public function releaseReservation()
    {
        if ($this->status === self::STATUS_RESERVED) {
            $this->update([
                'status' => self::STATUS_AVAILABLE
            ]);
            
            // Log movement
            $this->logMovement('RELEASED');
        }
    }
    
    /**
     * Log movement/status change
     */
    protected function logMovement($movementType, $additionalData = [])
    {
        $movementData = array_merge([
            'serial_number_id' => $this->id,
            'movement_type' => $movementType,
            'movement_date' => now(),
            'previous_status' => $this->getOriginal('status'),
            'new_status' => $this->status,
            'from_warehouse_id' => $this->getOriginal('current_warehouse_id'),
            'to_warehouse_id' => $this->current_warehouse_id,
            'from_location' => $this->getOriginal('current_location'),
            'to_location' => $this->current_location,
            'created_by' => auth()->user()->id ?? null
        ], $additionalData);
        
        SerialNumberMovement::create($movementData);
    }
    
    /**
     * Get warranty status
     */
    public function getWarrantyStatus(): string
    {
        if (!$this->warranty_end_date) {
            return 'No Warranty';
        }
        
        if ($this->warranty_end_date->isPast()) {
            return 'Expired';
        }
        
        if ($this->warranty_end_date->diffInDays(now()) <= 30) {
            return 'Expiring Soon';
        }
        
        return 'Active';
    }
    
    /**
     * Calculate remaining warranty days
     */
    public function getRemainingWarrantyDays(): ?int
    {
        if (!$this->warranty_end_date || $this->warranty_end_date->isPast()) {
            return null;
        }
        
        return now()->diffInDays($this->warranty_end_date);
    }
    
    /**
     * Get formatted serial number with product info
     */
    public function getFormattedSerial(): string
    {
        $productName = $this->product ? $this->product->name : 'Unknown';
        return sprintf('%s - %s', $this->serial_number, $productName);
    }
    
    /**
     * Get status badge HTML
     */
    public function getStatusBadge(): string
    {
        $badges = [
            self::STATUS_AVAILABLE => '<span class="badge bg-success">Available</span>',
            self::STATUS_SOLD => '<span class="badge bg-primary">Sold</span>',
            self::STATUS_DAMAGED => '<span class="badge bg-danger">Damaged</span>',
            self::STATUS_RETURNED => '<span class="badge bg-warning">Returned</span>',
            self::STATUS_LOST => '<span class="badge bg-dark">Lost</span>',
            self::STATUS_EXPIRED => '<span class="badge bg-secondary">Expired</span>',
            self::STATUS_DISPOSED => '<span class="badge bg-secondary">Disposed</span>',
            self::STATUS_RESERVED => '<span class="badge bg-info">Reserved</span>'
        ];
        
        return $badges[$this->status] ?? '<span class="badge bg-secondary">Unknown</span>';
    }
    
    /**
     * Get condition badge HTML
     */
    public function getConditionBadge(): string
    {
        $badges = [
            self::CONDITION_GOOD => '<span class="badge bg-success">Good</span>',
            self::CONDITION_REFURBISHED => '<span class="badge bg-warning">Refurbished</span>',
            self::CONDITION_DAMAGED => '<span class="badge bg-danger">Damaged</span>',
            self::CONDITION_DEFECTIVE => '<span class="badge bg-dark">Defective</span>'
        ];
        
        return $badges[$this->condition_status] ?? '<span class="badge bg-secondary">Unknown</span>';
    }
    
    /**
     * Bulk create serial numbers from array
     */
    public static function bulkCreate($productId, array $serialNumbers, array $commonData = [])
    {
        $data = [];
        
        foreach ($serialNumbers as $serialNumber) {
            $data[] = array_merge($commonData, [
                'id' => (string) Str::uuid(),
                'product_id' => $productId,
                'serial_number' => $serialNumber,
                'status' => self::STATUS_AVAILABLE,
                'condition_status' => self::CONDITION_GOOD,
                'is_active' => true,
                'created_at' => now(),
                'updated_at' => now(),
                'created_by' => auth()->user()->id ?? null
            ]);
        }
        
        return self::insert($data);
    }
}