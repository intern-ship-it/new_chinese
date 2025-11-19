<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;

class StockMovement extends Model
{
    use HasFactory;

    protected $table = 'stock_movements';

    protected $primaryKey = 'id';
    public $incrementing = false; // since UUID is used
    protected $keyType = 'string';

    protected $fillable = [
        'movement_number',
        'movement_type',
        'movement_subtype',
        'product_id',
        'warehouse_id',
        'quantity',
        'unit_cost',
        'total_cost',
        'batch_number',
        'expiry_date',
        'reference_type',
        'reference_id',
        'notes',
        'approval_status',
        'approved_by',
        'approved_at',
        'created_by',
        'input_uom_id'
    ];

    protected $casts = [
        'quantity' => 'decimal:3',
        'unit_cost' => 'decimal:2',
        'total_cost' => 'decimal:2',
        'expiry_date' => 'date:Y-m-d',
        'approved_at' => 'datetime',
        'created_at' => 'datetime',
    ];
public $timestamps = false;

    /*
     |--------------------------------------------------------------------------
     | Relationships
     |--------------------------------------------------------------------------
     */

    public function product()
    {
        return $this->belongsTo(Product::class);
    }

    public function warehouse()
    {
        return $this->belongsTo(Warehouse::class);
    }

    public function creator()
    {
        return $this->belongsTo(User::class, 'created_by');
    }

    public function approver()
    {
        return $this->belongsTo(User::class, 'approved_by');
    }
}
