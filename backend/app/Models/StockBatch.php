<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;

class StockBatch extends Model
{
    use HasFactory;

    protected $table = 'stock_batches';
    protected $primaryKey = 'id';
    public $incrementing = false; // UUID
    protected $keyType = 'string';

    public $timestamps = false; // only created_at

    protected $fillable = [
        'product_id',
        'warehouse_id',
        'batch_number',
        'quantity',
        'unit_cost',
        'expiry_date',
        'manufacture_date',
        'created_at',
    ];

    protected $casts = [
        'quantity' => 'decimal:3',
        'unit_cost' => 'decimal:2',
        'expiry_date' => 'date:Y-m-d',
        'manufacture_date' => 'date:Y-m-d',
        'created_at' => 'datetime',
    ];

    // Relationships
    public function product()
    {
        return $this->belongsTo(Product::class);
    }

    public function warehouse()
    {
        return $this->belongsTo(Warehouse::class);
    }
}
