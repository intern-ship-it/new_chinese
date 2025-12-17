<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\SoftDeletes;

class SaleItem extends Model
{
    use HasFactory, SoftDeletes;

    protected $table = 'sale_items';

    protected $fillable = [
        'name_primary',
        'name_secondary',
        'description',
        'short_code',
        'ledger_id',
        'sale_type',
        'price',
        'special_price',
        'image_url',
        'grayscale_image_url',
        'status',
        'is_inventory',
        'is_commission',
        'created_by',
        'updated_by',
    ];

    protected $casts = [
        'status' => 'boolean',
        'is_inventory' => 'boolean',
        'is_commission' => 'boolean',
        'price' => 'decimal:2',
        'special_price' => 'decimal:2',
    ];

    protected $dates = ['deleted_at'];

    protected $appends = ['effective_price', 'has_bom_products', 'has_commissions', 'total_commission_percent'];

    /**
     * Relationship: Ledger account
     */
    public function ledger()
    {
        return $this->belongsTo(Ledger::class, 'ledger_id');
    }

    /**
     * Relationship: Categories (Many-to-Many)
     */
    public function categories()
    {
        return $this->belongsToMany(SaleCategory::class, 'sale_item_categories', 'sale_item_id', 'sale_category_id')
            ->withTimestamps();
    }

    /**
     * Relationship: Sessions (Many-to-Many)
     */
    public function sessions()
    {
        return $this->belongsToMany(SaleSession::class, 'sale_item_sessions', 'sale_item_id', 'sale_session_id')
            ->withTimestamps();
    }

    /**
     * Relationship: Deities (Many-to-Many)
     */
    public function deities()
    {
        return $this->belongsToMany(Deity::class, 'sale_item_deities', 'sale_item_id', 'deity_id')
            ->withTimestamps();
    }

    /**
     * Relationship: BOM Products (Bill of Materials)
     */
    public function bomProducts()
    {
        return $this->hasMany(SaleItemBomProduct::class, 'sale_item_id');
    }

    /**
     * Relationship: Staff Commissions
     */
    public function commissions()
    {
        return $this->hasMany(SaleItemCommission::class, 'sale_item_id');
    }

    /**
     * User who created this record
     */
    public function createdBy()
    {
        return $this->belongsTo(User::class, 'created_by');
    }

    /**
     * User who last updated this record
     */
    public function updatedBy()
    {
        return $this->belongsTo(User::class, 'updated_by');
    }

    /**
     * Scope: Only active items
     */
    public function scopeActive($query)
    {
        return $query->where('status', true);
    }

    /**
     * Scope: Filter by sale type
     */
    public function scopeOfType($query, $type)
    {
        return $query->where('sale_type', $type);
    }

    /**
     * Scope: Items with inventory tracking
     */
    public function scopeWithInventory($query)
    {
        return $query->where('is_inventory', true);
    }

    /**
     * Scope: Items with commission
     */
    public function scopeWithCommission($query)
    {
        return $query->where('is_commission', true);
    }

    /**
     * Accessor: Get effective price (special price or regular price)
     */
    public function getEffectivePriceAttribute()
    {
        return $this->special_price ?? $this->price;
    }

    /**
     * Accessor: Check if item has BOM products
     */
    public function getHasBomProductsAttribute()
    {
        return $this->bomProducts()->count() > 0;
    }

    /**
     * Accessor: Check if item has commissions
     */
    public function getHasCommissionsAttribute()
    {
        return $this->commissions()->count() > 0;
    }

    /**
     * Accessor: Get total commission percentage
     */
    public function getTotalCommissionPercentAttribute()
    {
        return $this->commissions()->sum('commission_percent');
    }

    /**
     * Check if commission total is valid (not exceeding 100%)
     */
    public function hasValidCommissionTotal()
    {
        return $this->total_commission_percent <= 100;
    }

    /**
     * Get commission remaining percentage
     */
    public function getCommissionRemaining()
    {
        return max(0, 100 - $this->total_commission_percent);
    }
}