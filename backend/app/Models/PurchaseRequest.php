<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Concerns\HasUuids;

class PurchaseRequest extends Model
{
    use HasUuids;

    protected $fillable = [
        'pr_number',
        'request_date',
        'requested_by',
        'department',
        'purpose',
        'required_by_date',
        'priority',
        'status',
        'approved_by',
        'approved_at',
        'approval_notes',
        'rejection_reason',
        'converted_to_po',
        'po_id',
        'converted_at',
        'converted_by',
        'notes',
        'created_by',
        'updated_by',
        'deleted_by',
        'deleted_reason',
        'conversion_status',
          'deleted_by',
        'deleted_reason',
        'conversion_status',
        'last_po_id',
        'partially_converted'
    ];

    protected $casts = [
        'request_date' => 'date:Y-m-d',
        'required_by_date' => 'date:Y-m-d',
        'approved_at' => 'datetime',
        'converted_at' => 'datetime',
        'converted_to_po' => 'boolean'
    ];

    public function items()
    {
        return $this->hasMany(PurchaseRequestItem::class, 'pr_id');
    }
    public function creator()
    {
        return $this->belongsTo(User::class, 'created_by');
    }
    public function requester()
    {
        return $this->belongsTo(User::class, 'requested_by');
    }
    public function updater()
    {
        return $this->belongsTo(User::class, 'updated_by');
    }

    public function converter()
    {
        return $this->belongsTo(User::class, 'converted_by');
    }

    public function rejector()
    {
        return $this->belongsTo(User::class, 'rejected_by');
    }

    public function canceller()
    {
        return $this->belongsTo(User::class, 'cancelled_by');
    }

    public function approver()
    {
        return $this->belongsTo(User::class, 'approved_by');
    }

    public function purchaseOrder()
    {
        return $this->belongsTo(PurchaseOrder::class, 'po_id');
    }

    // Generate PR Number
    public static function generatePRNumber()
    {
        $year = date('Y');
        $lastPR = self::whereYear('created_at', $year)
            ->orderBy('pr_number', 'desc')
            ->first();

        if ($lastPR) {
            $lastNumber = intval(substr($lastPR->pr_number, -4));
            $newNumber = str_pad($lastNumber + 1, 4, '0', STR_PAD_LEFT);
        } else {
            $newNumber = '0001';
        }

        return "PR/{$year}/{$newNumber}";
    }
    // Add this method to generate PO number
    public static function generatePONumber()
    {
        $prefix = 'PO';
        $year = date('Y');
        $month = date('m');

        $lastPO = self::where('po_number', 'like', $prefix . $year . $month . '%')
            ->orderBy('po_number', 'desc')
            ->first();

        if ($lastPO) {
            $lastNumber = intval(substr($lastPO->po_number, -4));
            $newNumber = str_pad($lastNumber + 1, 4, '0', STR_PAD_LEFT);
        } else {
            $newNumber = '0001';
        }

        return $prefix . $year . $month . $newNumber;
    }
}
