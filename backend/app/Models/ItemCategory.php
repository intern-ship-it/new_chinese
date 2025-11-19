<?php

namespace App\Models;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\HasMany;
use Illuminate\Database\Eloquent\Relations\BelongsTo;

class ItemCategory extends Model
{
    protected $table = 'item_categories';

    protected $fillable = [
        'category_code',
        'category_name',
        'parent_id',
        'is_active'
    ];
        public $timestamps = false; 
    protected $casts = [
        'is_active' => 'boolean'
    ];

    public function parent(): BelongsTo
    {
        return $this->belongsTo(ItemCategory::class, 'parent_id');
    }

    public function children(): HasMany
    {
        return $this->hasMany(ItemCategory::class, 'parent_id');
    }

    public function items(): HasMany
    {
        return $this->hasMany(Product::class, 'category_id');
    }
}