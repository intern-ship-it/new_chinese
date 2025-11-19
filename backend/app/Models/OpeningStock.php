<?php
// app/Models/OpeningStock.php
namespace App\Models;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;

class OpeningStock extends Model
{
    protected $table = 'opening_stock';
    
    protected $fillable = [
        'product_id',
        'warehouse_id',
        'quantity',
        'unit_price',
        'total_value',
        'stock_date',
        'reference_no',
        'notes',
        'is_active',
        'created_by',
        'updated_by'
    ];
    
    protected $casts = [
        'quantity' => 'decimal:3',
        'unit_price' => 'decimal:2',
        'total_value' => 'decimal:2',
        'stock_date' => 'date:Y-m-d',
        'is_active' => 'boolean'
    ];
    
    public function product(): BelongsTo
    {
        return $this->belongsTo(Product::class);
    }
    
    public function warehouse(): BelongsTo
    {
        return $this->belongsTo(Warehouse::class);
    }
    
    public function createdBy(): BelongsTo
    {
        return $this->belongsTo(User::class, 'created_by');
    }
    
    public function updatedBy(): BelongsTo
    {
        return $this->belongsTo(User::class, 'updated_by');
    }
    
    // Calculate total value before saving
    protected static function boot()
    {
        parent::boot();
        
        static::saving(function ($model) {
            $model->total_value = $model->quantity * $model->unit_price;
        });
    }
}