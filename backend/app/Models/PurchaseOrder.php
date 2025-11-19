<?php
// app/Models/PurchaseOrder.php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Concerns\HasUuids;

class PurchaseOrder extends Model
{
    use HasUuids;

    protected $fillable = [
        'po_number', 'po_date', 'supplier_id', 'pr_id', 'quotation_ref',
        'delivery_date', 'delivery_address', 'shipping_method',
        'subtotal', 'total_tax', 'shipping_charges', 'other_charges',
        'discount_amount', 'total_amount', 'payment_terms', 'payment_due_date',
        'status', 'approval_required', 'approved_by', 'approved_at',
        'approval_notes', 'rejection_reason', 'invoice_status', 'grn_status',
        'payment_status', 'terms_conditions', 'internal_notes',
        'created_by', 'updated_by'
    ];

    protected $casts = [
        'po_date' => 'date:Y-m-d',
        'delivery_date' => 'date:Y-m-d',
        'payment_due_date' => 'date:Y-m-d',
        'approved_at' => 'datetime',
        'subtotal' => 'decimal:2',
        'total_tax' => 'decimal:2',
        'shipping_charges' => 'decimal:2',
        'other_charges' => 'decimal:2',
        'discount_amount' => 'decimal:2',
        'total_amount' => 'decimal:2',
        'approval_required' => 'boolean'
    ];

    public function supplier()
    {
        return $this->belongsTo(Supplier::class);
    }

    public function purchaseRequest()
    {
        return $this->belongsTo(PurchaseRequest::class, 'pr_id');
    }

    public function items()
    {
        return $this->hasMany(PurchaseOrderItem::class, 'po_id');
    }

    public function invoices()
    {
        return $this->hasMany(PurchaseInvoice::class, 'po_id');
    }

    public function grns()
    {
        return $this->hasMany(GRN::class, 'po_id');
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