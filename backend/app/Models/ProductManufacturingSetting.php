<?php
// app/Models/ProductManufacturingSetting.php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Concerns\HasUuids;
use Illuminate\Database\Eloquent\Relations\BelongsTo;

class ProductManufacturingSetting extends Model
{
    use HasUuids;

    protected $table = 'product_manufacturing_settings';

    protected $fillable = [
        'product_id',
        'manufacturing_type',
        'requires_quality_check',
        'track_batches',
        'standard_production_time',
        'standard_batch_size',
        'is_active',
        'created_by',
        'updated_by'
    ];

    protected $casts = [
        'requires_quality_check' => 'boolean',
        'track_batches' => 'boolean',
        'is_active' => 'boolean',
        'standard_production_time' => 'decimal:2',
        'standard_batch_size' => 'decimal:3'
    ];

    const TYPE_MANUFACTURABLE = 'MANUFACTURABLE';
    const TYPE_RAW_MATERIAL = 'RAW_MATERIAL';
    const TYPE_BOTH = 'BOTH';

    /**
     * Relationships
     */
    public function product(): BelongsTo
    {
        return $this->belongsTo(Product::class, 'product_id');
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
     * Scopes
     */
    public function scopeActive($query)
    {
        return $query->where('is_active', true);
    }

    public function scopeManufacturable($query)
    {
        return $query->whereIn('manufacturing_type', [self::TYPE_MANUFACTURABLE, self::TYPE_BOTH]);
    }

    public function scopeRawMaterials($query)
    {
        return $query->whereIn('manufacturing_type', [self::TYPE_RAW_MATERIAL, self::TYPE_BOTH]);
    }

    /**
     * Methods
     */
    public function canBeManufactured(): bool
    {
        return $this->is_active && 
               in_array($this->manufacturing_type, [self::TYPE_MANUFACTURABLE, self::TYPE_BOTH]);
    }

    public function canBeUsedAsRawMaterial(): bool
    {
        return $this->is_active && 
               in_array($this->manufacturing_type, [self::TYPE_RAW_MATERIAL, self::TYPE_BOTH]);
    }

    /**
     * Check if product has active BOM
     */
    public function hasActiveBom(): bool
    {
        return BomMaster::where('product_id', $this->product_id)
            ->where('status', 'ACTIVE')
            ->exists();
    }

    /**
     * Get active BOM
     */
    public function getActiveBom()
    {
        return BomMaster::where('product_id', $this->product_id)
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