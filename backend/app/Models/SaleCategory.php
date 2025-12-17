<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\SoftDeletes;

class SaleCategory extends Model
{
    use HasFactory, SoftDeletes;

    protected $table = 'sale_categories';

    protected $fillable = [
        'name_primary',
        'name_secondary',
        'description',
        'short_code',
        'status',
        'order_no',
        'created_by',
        'updated_by',
    ];

    protected $casts = [
        'status' => 'boolean',
        'order_no' => 'integer',
    ];

    protected $dates = ['deleted_at'];

    /**
     * Relationship: Sale items in this category
     */
    public function saleItems()
    {
        return $this->belongsToMany(SaleItem::class, 'sale_item_categories', 'sale_category_id', 'sale_item_id')
            ->withTimestamps();
    }

    /**
     * Scope: Only active categories
     */
    public function scopeActive($query)
    {
        return $query->where('status', true);
    }

    /**
     * Scope: Order by order_no
     */
    public function scopeOrdered($query)
    {
        return $query->orderBy('order_no', 'asc')->orderBy('name_primary', 'asc');
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
}