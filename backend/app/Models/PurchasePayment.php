<?php
namespace App\Models;

use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Concerns\HasUuids;
use Illuminate\Database\Eloquent\SoftDeletes;

class PurchasePayment extends Model
{
    use HasUuids;
    use SoftDeletes;

    protected $fillable = [
        'payment_number',
        'payment_date',
        'invoice_id',
        'supplier_id',
        'payment_mode_id',
        'amount',
        'reference_number',
        'bank_name',
        'bank_branch',
        'cheque_date',
        'status',
        'notes',
        'created_by',
        'updated_by',
        'approval_required',    
        'approval_status',     
        'approved_by',         
        'approved_at',       
        'approval_notes',       
        'account_migration',      
        'journal_entry_id'       
    ];

    protected $casts = [
        'payment_date' => 'date',
        'cheque_date' => 'date',
        'amount' => 'decimal:2',
        'approval_required' => 'boolean',
        'account_migration' => 'integer',
        'approved_at' => 'datetime'
    ];

    public function invoice()
    {
        return $this->belongsTo(PurchaseInvoice::class, 'invoice_id');
    }

    public function supplier()
    {
        return $this->belongsTo(Supplier::class);
    }

    public function paymentMode()
    {
        return $this->belongsTo(PaymentMode::class, 'payment_mode_id');
    }

    public function creator()
    {
        return $this->belongsTo(User::class, 'created_by');
    }
}