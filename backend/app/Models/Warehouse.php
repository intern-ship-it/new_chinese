<?php
// app/Models/Warehouse.php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;


class Warehouse extends Model
{
    
    protected $fillable = [
        'code',
        'name',
        'description',
        'is_active',
        'created_by',
        'updated_by'
    ];

    protected $casts = [
        'is_active' => 'integer',
        'created_at' => 'datetime',
        'updated_at' => 'datetime',
    ];
   /**
     * Scope to filter active warehouses
     */
    public function scopeActive($query)
    {
        return $query->where('is_active', true);
    }

    /**
     * Get the user who created this warehouse
     */
    public function creator()
    {
        return $this->belongsTo(User::class, 'created_by');
    }

    /**
     * Get the user who last updated this warehouse
     */
    public function updater()
    {
        return $this->belongsTo(User::class, 'updated_by');
    }



    /**
     * Products relationship (for future use)
     */
    public function products()
    {
        return $this->hasMany(Product::class, 'warehouse_id');
    }

    /**
     * Inventory transactions relationship (for future use)
     */
    public function inventoryTransactions()
    {
        return $this->hasMany(InventoryTransaction::class, 'warehouse_id');
    }

    /**
     * Check if warehouse can be deleted
     */
    public function canBeDeleted()
    {
        // Check if warehouse has any associated products or transactions
        return !$this->products()->exists() && 
               !$this->inventoryTransactions()->exists();
    }

    /**
     * Get formatted status
     */
    public function getStatusTextAttribute()
    {
        return $this->is_active ? 'Active' : 'Inactive';
    }

    /**
     * Get formatted code with name
     */
    public function getFullNameAttribute()
    {
        return $this->code . ' - ' . $this->name;
    }
}