<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;

class PurchaseRequestItemConversion extends Model
{
    protected $table = 'purchase_request_item_conversions';
    public $timestamps = false;
    
    protected $fillable = [
        'pr_id',
        'pr_item_id',
        'po_item_id', 
        'supplier_id',
        'converted_at'
    ];
    
    protected $casts = [
        'converted_at' => 'datetime'
    ];
    
    public function prItem()
    {
        return $this->belongsTo(PurchaseRequestItem::class, 'pr_item_id');
    }
    
    public function poItem()
    {
        return $this->belongsTo(PurchaseOrderItem::class, 'po_item_id');
    }
    
    public function supplier()
    {
        return $this->belongsTo(Supplier::class, 'supplier_id');
    }
}