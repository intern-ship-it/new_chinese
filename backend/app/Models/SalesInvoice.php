<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Concerns\HasUuids;
use Illuminate\Database\Eloquent\SoftDeletes;

class SalesInvoice extends Model
{
    use HasUuids;
    use SoftDeletes;

    protected $fillable = [
        'invoice_number', 'invoice_type', 'invoice_date', 'customer_invoice_no',
        'devotee_id', 'so_id', 'payment_due_date', 'payment_status',
        'subtotal', 'total_tax', 'discount_amount', 'shipping_charges', 'other_charges',
        'total_amount', 'paid_amount', 'balance_amount', 'terms_conditions', 'notes',
        'status', 'account_migration', 'migration_error',
        'created_by', 'updated_by', 'posted_by', 'posted_at'
    ];

    protected $casts = [
        'invoice_date' => 'date:Y-m-d',
        'payment_due_date' => 'date:Y-m-d',
        'posted_at' => 'datetime',
        'subtotal' => 'decimal:2',
        'total_tax' => 'decimal:2',
        'discount_amount' => 'decimal:2',
        'shipping_charges' => 'decimal:2',
        'other_charges' => 'decimal:2',
        'total_amount' => 'decimal:2',
        'paid_amount' => 'decimal:2',
        'balance_amount' => 'decimal:2',
        'account_migration' => 'boolean',
    ];

    protected $appends = ['balance_amount'];

    public function getBalanceAmountAttribute()
    {
        return $this->total_amount - $this->paid_amount;
    }

    // Relationships
    public function devotee()
    {
        return $this->belongsTo(Devotee::class);
    }

    public function salesOrder()
    {
        return $this->belongsTo(SalesOrder::class, 'so_id');
    }

    public function items()
    {
        return $this->hasMany(SalesInvoiceItem::class, 'invoice_id');
    }

    public function payments()
    {
        return $this->hasMany(SalesInvoicePayment::class, 'invoice_id');
    }

    public function creator()
    {
        return $this->belongsTo(User::class, 'created_by');
    }

    public function updater()
    {
        return $this->belongsTo(User::class, 'updated_by');
    }

    public function poster()
    {
        return $this->belongsTo(User::class, 'posted_by');
    }

    // Auto-generate Invoice Number
    public static function generateInvoiceNumber()
    {
        $prefix = 'SINV' . date('Ym') . '-';
        $lastInvoice = self::where('invoice_number', 'like', "$prefix%")
            ->orderBy('invoice_number', 'desc')
            ->first();
        
        if ($lastInvoice) {
            $lastNumber = intval(substr($lastInvoice->invoice_number, -5));
            $newNumber = $lastNumber + 1;
        } else {
            $newNumber = 1;
        }
        
        return $prefix . str_pad($newNumber, 5, '0', STR_PAD_LEFT);
    }
    
    protected static function boot()
    {
        parent::boot();
        static::creating(function ($model) {
            if (empty($model->invoice_number)) {
                $model->invoice_number = self::generateInvoiceNumber();
            }
        });
    }

    
}
