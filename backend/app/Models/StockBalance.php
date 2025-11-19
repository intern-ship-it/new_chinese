<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Concerns\HasUuids;

class StockBalance extends Model
{
    use HasFactory, HasUuids;

    protected $table = 'stock_balances';
    public $timestamps = false;

    protected $fillable = [
        'product_id',
        'warehouse_id',
        'current_quantity',
        'reserved_quantity',
        'last_updated',
        'last_movement_date',
    ];

    protected $casts = [
        'current_quantity' => 'decimal:3',
        'reserved_quantity' => 'decimal:3',
        'available_quantity' => 'decimal:3', // Keep this for reading
        'last_updated' => 'datetime',
    ];

    // Add this to handle UUID generation
    protected static function boot()
    {
        parent::boot();
        
        static::creating(function ($model) {
            if (empty($model->{$model->getKeyName()})) {
                $model->{$model->getKeyName()} = (string) \Illuminate\Support\Str::uuid();
            }
        });
    }

    // Relationships
    public function product()
    {
        return $this->belongsTo(Product::class);
    }

    public function warehouse()
    {
        return $this->belongsTo(Warehouse::class);
    }
    public function setLastMovementDateAttribute($value)
{
    $this->attributes['last_updated'] = $value;
}

public function getLastMovementDateAttribute()
{
    return $this->attributes['last_updated'];
}
}