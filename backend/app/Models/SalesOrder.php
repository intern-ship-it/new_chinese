<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Concerns\HasUuids;
use Illuminate\Database\Eloquent\SoftDeletes;

class SalesOrder extends Model
{
    use HasUuids, SoftDeletes;
    protected $dates = ['deleted_at'];
    protected $fillable = [
        'so_number',
        'so_date',
        'devotee_id',
        'quotation_ref',
        'invoice_created',
        'delivery_date',
        'delivery_address',
        'subtotal',
        'total_tax',
        'discount_amount',
        'total_amount',
        'status',
        'internal_notes',
        'rejection_reason',
        'created_by',
        'updated_by',
        'approved_by',
        'approved_at',
        'payment_status'
    ];

    protected $casts = [
        'so_date' => 'date:Y-m-d',
        'delivery_date' => 'date:Y-m-d',
        'approved_at' => 'datetime',
        'subtotal' => 'decimal:2',
        'total_tax' => 'decimal:2',
        'discount_amount' => 'decimal:2',
        'total_amount' => 'decimal:2',
        'invoice_created' => 'boolean',
    ];

    public function devotee()
    {
        return $this->belongsTo(Devotee::class);
    }

    public function items()
    {
        return $this->hasMany(SalesOrderItem::class, 'sales_order_id');
    }
    public function invoices()
    {
        return $this->hasMany(SalesInvoice::class, 'so_id', 'id');
    }

    // Get the main invoice (there should typically be only one)
    public function invoice()
    {
        return $this->hasOne(SalesInvoice::class, 'so_id', 'id');
    }
    public function creator()
    {
        return $this->belongsTo(User::class, 'created_by');
    }

    public function approver()
    {
        return $this->belongsTo(User::class, 'approved_by');
    }

    // Auto-generate SO Number
    public static function generateSONumber()
    {
        $prefix = 'SO-' . date('Ym');
        $lastOrder = self::where('so_number', 'like', "$prefix%")->orderBy('so_number', 'desc')->first();

        if ($lastOrder) {
            $lastNumber = intval(substr($lastOrder->so_number, -4));
            $newNumber = $lastNumber + 1;
        } else {
            $newNumber = 1;
        }

        return $prefix . str_pad($newNumber, 4, '0', STR_PAD_LEFT);
    }

    protected static function boot()
    {
        parent::boot();
        static::creating(function ($model) {
            if (empty($model->so_number)) {
                $model->so_number = self::generateSONumber();
            }
        });
    }
}
