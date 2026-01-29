<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;
use Illuminate\Support\Str;

class SalesDeliveryOrderItem extends Model
{
    protected $table = 'sales_delivery_order_items';
    
    public $incrementing = false;
    protected $keyType = 'string';

    protected $fillable = [
        'delivery_order_id',
        'sales_order_item_id',
        'is_addon',
        'sales_package_id',
        'product_id',
        'sale_item_id',
        'item_type',
        'description',
        'ordered_quantity',
        'delivered_quantity',
        'accepted_quantity',
        'rejected_quantity',
        'unit_price',
        'tax_amount',
        'discount_amount',
        'total_amount',
        'condition_on_delivery',
        'rejection_reason',
        'batch_number',
        'serial_numbers',
        'expiry_date',
        'uom_id',
        'warehouse_id',
        'rack_location',
        'sort_order',
        'notes',
        'package_item_index'
    ];

    protected $casts = [
        'is_addon' => 'boolean',
        'sales_package_id' => 'integer', // CORRECTED: Cast to integer for BIGINT
        'product_id' => 'integer',       // CORRECTED: Cast to integer for BIGINT
        'sale_item_id' => 'integer',     // CORRECTED: Cast to integer for BIGINT
        'uom_id' => 'integer',           // CORRECTED: Cast to integer for BIGINT
        'warehouse_id' => 'integer',     // CORRECTED: Cast to integer for BIGINT
        'ordered_quantity' => 'decimal:3',
        'delivered_quantity' => 'decimal:3',
        'accepted_quantity' => 'decimal:3',
        'rejected_quantity' => 'decimal:3',
        'unit_price' => 'decimal:2',
        'tax_amount' => 'decimal:2',
        'discount_amount' => 'decimal:2',
        'total_amount' => 'decimal:2',
        'serial_numbers' => 'array',
        'expiry_date' => 'date',
        'created_at' => 'datetime',
        'updated_at' => 'datetime',
    ];

    protected $appends = ['condition_badge', 'delivery_percentage'];

    // Auto-generate UUID on creation
    protected static function boot()
    {
        parent::boot();
        
        static::creating(function ($model) {
            if (empty($model->id)) {
                $model->id = (string) Str::uuid();
            }
        });
        
        static::saved(function ($model) {
            // Update delivery order totals when item changes
            $model->deliveryOrder->calculateTotals()->save();
        });
    }

    // ========================================
    // RELATIONSHIPS
    // ========================================

    /**
     * Parent delivery order
     */
    public function deliveryOrder()
    {
        return $this->belongsTo(SalesDeliveryOrder::class, 'delivery_order_id');
    }

    /**
     * Related sales order item
     */
    public function salesOrderItem()
    {
        return $this->belongsTo(SalesOrderItem::class, 'sales_order_item_id');
    }

    /**
     * Sales Package (if package item)
     */
    public function salesPackage()
    {
        return $this->belongsTo(SalesPackage::class, 'sales_package_id');
    }

    /**
     * Product (if product addon) - BIGINT foreign key
     */
    public function product()
    {
        return $this->belongsTo(Product::class, 'product_id');
    }

    /**
     * Sale Item (if sale item addon) - BIGINT foreign key
     */
    public function saleItem()
    {
        return $this->belongsTo(SaleItem::class, 'sale_item_id');
    }

    /**
     * UOM - BIGINT foreign key
     */
    public function uom()
    {
        return $this->belongsTo(Uom::class, 'uom_id');
    }

    /**
     * Warehouse - BIGINT foreign key
     */
    public function warehouse()
    {
        return $this->belongsTo(Warehouse::class, 'warehouse_id');
    }

    // ========================================
    // ACCESSORS & MUTATORS
    // ========================================

    /**
     * Get condition badge for UI
     */
    public function getConditionBadgeAttribute()
    {
        $badges = [
            'GOOD' => '<span class="badge bg-success">Good</span>',
            'DAMAGED' => '<span class="badge bg-warning">Damaged</span>',
            'DEFECTIVE' => '<span class="badge bg-danger">Defective</span>',
        ];
        
        return $badges[$this->condition_on_delivery] ?? '<span class="badge bg-secondary">Unknown</span>';
    }

    /**
     * Calculate delivery percentage
     */
    public function getDeliveryPercentageAttribute()
    {
        if ($this->ordered_quantity == 0) {
            return 0;
        }
        
        return round(($this->delivered_quantity / $this->ordered_quantity) * 100, 2);
    }

    /**
     * Get item display name
     */
    public function getItemNameAttribute()
    {
        if ($this->is_addon) {
            if ($this->item_type === 'product' && $this->product) {
                return $this->product->product_name;
            } elseif ($this->item_type === 'sales_item' && $this->saleItem) {
                return $this->saleItem->item_name;
            }
        } else {
            if ($this->salesPackage) {
                return $this->salesPackage->package_name;
            }
        }
        
        return $this->description ?? 'Unknown Item';
    }

    // ========================================
    // BUSINESS LOGIC METHODS
    // ========================================

    /**
     * Calculate total amount
     */
    public function calculateTotal()
    {
        $subtotal = $this->delivered_quantity * $this->unit_price;
        $this->total_amount = $subtotal + $this->tax_amount - $this->discount_amount;
        
        return $this;
    }

    /**
     * Update quality check quantities
     */
    public function updateQualityCheck($acceptedQty, $rejectedQty, $condition, $reason = null)
    {
        $this->accepted_quantity = $acceptedQty;
        $this->rejected_quantity = $rejectedQty;
        $this->condition_on_delivery = $condition;
        $this->rejection_reason = $reason;
        
        $this->save();
        
        return $this;
    }

    /**
     * Check if fully delivered
     */
    public function isFullyDelivered()
    {
        return $this->delivered_quantity >= $this->ordered_quantity;
    }

    /**
     * Check if partially delivered
     */
    public function isPartiallyDelivered()
    {
        return $this->delivered_quantity > 0 && $this->delivered_quantity < $this->ordered_quantity;
    }

    /**
     * Get remaining quantity to deliver
     */
    public function getRemainingQuantity()
    {
        return max(0, $this->ordered_quantity - $this->delivered_quantity);
    }
}