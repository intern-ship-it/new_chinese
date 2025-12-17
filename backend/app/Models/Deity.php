<?php
namespace App\Models;

use Illuminate\Database\Eloquent\Model;

class Deity extends Model
{
    protected $table = 'deities';

    protected $fillable = [
        'deity_code',
        'name',
        'name_secondary',
        'description',
        'image_url',
        'order_no',
        'status',
        'created_by',
        'updated_by',
    ];

    protected $casts = [
        'status' => 'boolean',
        'order_no' => 'integer',
        'created_at' => 'datetime',
        'updated_at' => 'datetime'
    ];

    /**
     * Relationship: Sale items associated with this deity
     */
    public function saleItems()
    {
        return $this->belongsToMany(SaleItem::class, 'sale_item_deities', 'deity_id', 'sale_item_id')
            ->withTimestamps();
    }

    /**
     * Scope: Only active deities
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
        return $query->orderBy('order_no', 'asc')->orderBy('name', 'asc');
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