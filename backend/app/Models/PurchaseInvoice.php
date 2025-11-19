<?php
namespace App\Models;

use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Concerns\HasUuids;
use Illuminate\Database\Eloquent\SoftDeletes;

class PurchaseInvoice extends Model
{
    use HasUuids;
    use SoftDeletes;

    protected $fillable = [
        'invoice_number', 'supplier_invoice_no', 'invoice_date',
        'invoice_type', 'po_id', 'supplier_id', 'subtotal', 'total_tax',
        'shipping_charges', 'other_charges', 'discount_amount', 'total_amount',
        'paid_amount', 'payment_status', 'payment_due_date', 'status',
        'grn_required', 'grn_status', 'terms_conditions', 'notes', 'account_migration', 'journal_entry_id',
        'created_by', 'updated_by'
    ];

    protected $casts = [
        'invoice_date' => 'date:Y-m-d',
        'payment_due_date' => 'date:Y-m-d',
        'subtotal' => 'decimal:2',
        'total_tax' => 'decimal:2',
        'shipping_charges' => 'decimal:2',
        'other_charges' => 'decimal:2',
        'discount_amount' => 'decimal:2',
        'total_amount' => 'decimal:2',
        'paid_amount' => 'decimal:2',
		'account_migration' => 'integer',
        'grn_required' => 'boolean'
    ];

    protected $appends = ['balance_amount'];

    public function getBalanceAmountAttribute()
    {
        return $this->total_amount - $this->paid_amount;
    }

    public function supplier()
    {
        return $this->belongsTo(Supplier::class);
    }

    public function purchaseOrder()
    {
        return $this->belongsTo(PurchaseOrder::class, 'po_id');
    }

    public function items()
    {
        return $this->hasMany(PurchaseInvoiceItem::class, 'invoice_id');
    }

    public function payments()
    {
        return $this->hasMany(PurchasePayment::class, 'invoice_id');
    }

    public function grns()
    {
        return $this->hasMany(GRN::class, 'invoice_id');
    }

    public function creator()
    {
        return $this->belongsTo(User::class, 'created_by');
    }
}