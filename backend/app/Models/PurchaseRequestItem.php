<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Concerns\HasUuids;
use Illuminate\Database\Eloquent\Relations\BelongsTo;

class PurchaseRequestItem extends Model
{
    use HasUuids;

    /**
     * The table associated with the model.
     *
     * @var string
     */
    protected $table = 'purchase_request_items';

    /**
     * The primary key type.
     *
     * @var string
     */
    protected $keyType = 'string';

    /**
     * Indicates if the IDs are auto-incrementing.
     *
     * @var bool
     */
    public $incrementing = false;

    /**
     * The attributes that are mass assignable.
     *
     * @var array
     */
    protected $fillable = [
        'pr_id',
        'item_type',
        'product_id',
        'service_id',
        'description',
        'quantity',
        'uom_id',
        'preferred_supplier_id',
        'remarks',
        'status',
        'sort_order',
        'po_item_id',
        'is_converted',
        'converted_at'
    ];

    /**
     * The attributes that should be cast.
     *
     * @var array
     */
    protected $casts = [
        'quantity' => 'decimal:3',
        'sort_order' => 'integer',
        'product_id' => 'integer',
        'service_id' => 'integer',
        'uom_id' => 'integer',
        'created_at' => 'datetime',
        'updated_at' => 'datetime'
    ];

    /**
     * Default attribute values.
     *
     * @var array
     */
    protected $attributes = [
        'status' => 'PENDING',
        'sort_order' => 0
    ];

    /**
     * Get the purchase request that owns this item.
     */
    public function purchaseRequest(): BelongsTo
    {
        return $this->belongsTo(PurchaseRequest::class, 'pr_id');
    }

    /**
     * Get the product associated with this item.
     */
    public function product(): BelongsTo
    {
        return $this->belongsTo(Product::class, 'product_id');
    }

    /**
     * Get the service associated with this item.
     */
    public function service(): BelongsTo
    {
        return $this->belongsTo(Service::class, 'service_id');
    }

    /**
     * Get the UOM (Unit of Measure) for this item.
     */
    public function uom(): BelongsTo
    {
        return $this->belongsTo(Uom::class, 'uom_id');
    }

    /**
     * Get the preferred supplier for this item.
     */
    public function preferredSupplier(): BelongsTo
    {
        return $this->belongsTo(Supplier::class, 'preferred_supplier_id');
    }

    /**
     * Get the item name based on type.
     *
     * @return string
     */
    public function getItemNameAttribute(): string
    {
        if ($this->item_type === 'product' && $this->product) {
            return $this->product->name;
        } elseif ($this->item_type === 'service' && $this->service) {
            return $this->service->name;
        }
        return 'Unknown Item';
    }

    /**
     * Get the item code based on type.
     *
     * @return string|null
     */
    public function getItemCodeAttribute(): ?string
    {
        if ($this->item_type === 'product' && $this->product) {
            return $this->product->code;
        } elseif ($this->item_type === 'service' && $this->service) {
            return $this->service->code;
        }
        return null;
    }

    /**
     * Scope a query to only include items of a specific type.
     */
    public function scopeOfType($query, string $type)
    {
        return $query->where('item_type', $type);
    }

    /**
     * Scope a query to only include items with a specific status.
     */
    public function scopeWithStatus($query, string $status)
    {
        return $query->where('status', $status);
    }

    /**
     * Scope a query to order items by sort order.
     */
    public function scopeOrdered($query)
    {
        return $query->orderBy('sort_order', 'asc');
    }

    /**
     * Check if this item is a product.
     */
    public function isProduct(): bool
    {
        return $this->item_type === 'product';
    }

    /**
     * Check if this item is a service.
     */
    public function isService(): bool
    {
        return $this->item_type === 'service';
    }

    /**
     * Get formatted quantity with UOM.
     */
    public function getFormattedQuantityAttribute(): string
    {
        $qty = number_format($this->quantity, 3);
        if ($this->uom) {
            return $qty . ' ' . $this->uom->name;
        }
        return $qty;
    }

    /**
     * Mark item as converted (when PR is converted to PO).
     */
    public function markAsConverted(): bool
    {
        return $this->update(['status' => 'CONVERTED']);
    }

    /**
     * Mark item as cancelled.
     */
    public function markAsCancelled(): bool
    {
        return $this->update(['status' => 'CANCELLED']);
    }
    // Add relationship
    public function purchaseOrderItem()
    {
        return $this->belongsTo(PurchaseOrderItem::class, 'po_item_id');
    }

    // Add scope
    public function scopeUnconverted($query)
    {
        return $query->whereNull('po_item_id');
    }

    public function scopeConverted($query)
    {
        return $query->whereNotNull('po_item_id');
    }

    // Add accessor
    public function getIsConvertedAttribute()
    {
        return !is_null($this->po_item_id);
    }
    public function conversions()
{
    return $this->hasMany(PurchaseRequestItemConversion::class, 'pr_item_id');
}

// Add method to check if converted for specific supplier
public function isConvertedForSupplier($supplierId)
{
    return $this->conversions()
        ->where('supplier_id', $supplierId)
        ->exists();
}
public function isConvertedForSupplierData($supplierId, $prId = null)
{
    $query = $this->conversions()->where('supplier_id', $supplierId);

    if ($prId) {
        $query->where('pr_id', $prId);
    }

    return $query->exists();
}
// Get list of suppliers this item was converted for
public function getConvertedSuppliers()
{
    return $this->conversions()
        ->with('supplier')
        ->get()
        ->pluck('supplier');
}
}
