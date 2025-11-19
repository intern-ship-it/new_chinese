<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\SoftDeletes;
use Illuminate\Support\Facades\Schema;

class Product extends Model
{
    use HasFactory;
    use SoftDeletes;

    protected $dates = ['deleted_at'];
    protected $fillable = [
        'product_code',
        'name',
        'description',
        'category_id',
        'ledger_id',  // Added
        'uom_id',
        'unit_price',
        'cost_price',
        'current_stock',
        'min_stock',
        'low_stock_alert',
        'is_stockable',
        'is_active',
        'barcode',
        'hsn_code',
        'gst_rate',
        'image_url',
        'specifications',
        'created_by',
        'updated_by',
        'average_cost',
        'last_purchase_cost',
        'available_stock',
        'last_stock_update',
        'product_type',
    ];

    protected $casts = [
        'average_cost' => 'decimal:2',
        'last_purchase_cost' => 'decimal:2',
        'unit_price' => 'decimal:2',
        'cost_price' => 'decimal:2',
        'current_stock' => 'decimal:3',
        'min_stock' => 'decimal:3',
        'gst_rate' => 'decimal:2',
        'is_stockable' => 'boolean',
        'is_active' => 'boolean',
        'low_stock_alert' => 'decimal:3',
        'specifications' => 'array'
    ];

    // Relationships
    public function category()
    {
        return $this->belongsTo(ItemCategory::class, 'category_id');
    }

    public function ledger()
    {
        return $this->belongsTo(Ledger::class, 'ledger_id');
    }

    public function uom()
    {
        return $this->belongsTo(Uom::class, 'uom_id');
    }
    public function getUomNameAttribute()
    {
        if ($this->uom && $this->uom->baseUnit) {
            return $this->uom->baseUnit->name;
        }


        return $this->uom->name ?? '';
    }
    public function createdBy()
    {
        return $this->belongsTo(User::class, 'created_by');
    }

    public function updatedBy()
    {
        return $this->belongsTo(User::class, 'updated_by');
    }

    /**
     * Manufacturing setting relationship
     * A product has one manufacturing setting
     */
    public function manufacturingSetting()
    {
        return $this->hasOne(ProductManufacturingSetting::class, 'product_id');
    }

    /**
     * BOM Masters where this product is the output
     */
    public function bomMasters()
    {
        return $this->hasMany(BomMaster::class, 'product_id');
    }

    /**
     * BOM Details where this product is used as raw material
     */
    public function bomDetails()
    {
        return $this->hasMany(BomDetail::class, 'raw_material_id');
    }

    // Check if stock is low
    public function isLowStock()
    {
        if (!$this->is_stockable || !$this->low_stock_alert) {
            return false;
        }

        return $this->current_stock <= $this->low_stock_alert;
    }

    // Scope for products with low stock alerts enabled
    public function scopeWithLowStockAlert($query)
    {
        return $query->where('low_stock_alert', true);
    }

    // Scope for products that are currently low on stock
    public function scopeLowStock($query)
    {
        return $query->where('is_stockable', true)
            ->where('low_stock_alert', '>', 0)
            ->whereRaw('current_stock <= low_stock_alert');
    }

    /**
     * Check if product can be manufactured
     */
    public function canBeManufactured(): bool
    {
        if (!$this->manufacturingSetting) {
            return false;
        }

        return $this->manufacturingSetting->canBeManufactured();
    }

    /**
     * Check if product can be used as raw material
     */
    public function canBeUsedAsRawMaterial(): bool
    {
        if (!$this->manufacturingSetting) {
            return true; // If no setting exists, assume it can be used as raw material
        }

        return $this->manufacturingSetting->canBeUsedAsRawMaterial();
    }

    /**
     * Get active BOM for this product
     */
    public function getActiveBom()
    {
        return $this->bomMasters()
            ->where('status', 'ACTIVE')
            ->where(function ($query) {
                $query->whereNull('effective_from')
                    ->orWhere('effective_from', '<=', now());
            })
            ->where(function ($query) {
                $query->whereNull('effective_to')
                    ->orWhere('effective_to', '>=', now());
            })
            ->first();
    }
}
