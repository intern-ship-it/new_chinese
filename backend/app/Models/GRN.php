<?php
namespace App\Models;

use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Concerns\HasUuids;

class GRN extends Model
{
    use HasUuids;

    protected $table = 'grn';

    protected $fillable = [
        'grn_number', 'grn_date', 'grn_type', 'po_id', 'invoice_id',
        'supplier_id', 'delivery_challan_no', 'delivery_date', 'vehicle_number',
        'quality_check_done', 'quality_check_by', 'quality_check_date',
        'quality_check_notes', 'status', 'warehouse_id', 'notes',
        'created_by', 'updated_by'
    ];

    protected $casts = [
        'grn_date' => 'date:Y-m-d',
        'delivery_date' => 'date:Y-m-d',
        'quality_check_date' => 'datetime',
        'quality_check_done' => 'boolean'
    ];

    public function supplier()
    {
        return $this->belongsTo(Supplier::class);
    }

    public function purchaseOrder()
    {
        return $this->belongsTo(PurchaseOrder::class, 'po_id');
    }

    public function invoice()
    {
        return $this->belongsTo(PurchaseInvoice::class, 'invoice_id');
    }

    public function warehouse()
    {
        return $this->belongsTo(Warehouse::class);
    }

    public function items()
    {
        return $this->hasMany(GRNItem::class, 'grn_id');
    }

    public function qualityChecker()
    {
        return $this->belongsTo(User::class, 'quality_check_by');
    }

    public function creator()
    {
        return $this->belongsTo(User::class, 'created_by');
    }
}