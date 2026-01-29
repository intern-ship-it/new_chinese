<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;
use Illuminate\Support\Str;

class SalesDeliveryOrder extends Model
{
    protected $table = 'sales_delivery_orders';
    
    public $incrementing = false;
    protected $keyType = 'string';

    protected $fillable = [
        'do_number',
        'do_date',
        'sales_order_id',
        'devotee_id',
        'delivery_order_no',
        'delivery_date',
        'vehicle_number',
        'warehouse_id',
        'quality_check_done',
        'quality_check_by',
        'quality_check_date',
        'quality_check_status',
        'quality_notes',
        'subtotal',
        'total_tax',
        'discount_amount',
        'total_amount',
        'status',
        'driver_name',
        'driver_contact',
        'notes',
        'created_by',
        'updated_by',
        'approved_by',
        'approved_at',
    ];

    protected $casts = [
        'do_date' => 'date',
        'delivery_date' => 'date',
        'quality_check_date' => 'date',
        'quality_check_done' => 'boolean',
        'warehouse_id' => 'integer',  // CORRECTED: Cast to integer for BIGINT
        'subtotal' => 'decimal:2',
        'total_tax' => 'decimal:2',
        'discount_amount' => 'decimal:2',
        'total_amount' => 'decimal:2',
        'approved_at' => 'datetime',
        'created_at' => 'datetime',
        'updated_at' => 'datetime',
    ];

    protected $appends = ['status_badge', 'quality_status_badge'];

    // Auto-generate UUID on creation
    protected static function boot()
    {
        parent::boot();
        
        static::creating(function ($model) {
            if (empty($model->id)) {
                $model->id = (string) Str::uuid();
            }
            
            // Auto-generate DO number if not provided
            if (empty($model->do_number)) {
                $model->do_number = static::generateDONumber();
            }
        });
    }

    /**
     * Generate DO Number
     * Format: DO-YYYYMM-XXXX
     */
    public static function generateDONumber()
    {
        $year = date('Y');
        $month = date('m');
        $prefix = "DO-{$year}{$month}-";
        
        // Get last DO number for this month
        $lastDO = static::where('do_number', 'LIKE', "{$prefix}%")
            ->orderBy('do_number', 'desc')
            ->first();
        
        if ($lastDO) {
            // Extract number and increment
            $lastNumber = (int) substr($lastDO->do_number, -4);
            $newNumber = $lastNumber + 1;
        } else {
            $newNumber = 1;
        }
        
        return $prefix . str_pad($newNumber, 4, '0', STR_PAD_LEFT);
    }

    // ========================================
    // RELATIONSHIPS
    // ========================================

    /**
     * Related Sales Order
     */
    public function salesOrder()
    {
        return $this->belongsTo(SalesOrder::class, 'sales_order_id');
    }

    /**
     * Customer/Devotee
     */
    public function devotee()
    {
        return $this->belongsTo(Devotee::class, 'devotee_id');
    }

    /**
     * Warehouse (BIGINT foreign key)
     */
    public function warehouse()
    {
        return $this->belongsTo(Warehouse::class, 'warehouse_id');
    }

    /**
     * Delivery Order Items
     */
    public function items()
    {
        return $this->hasMany(SalesDeliveryOrderItem::class, 'delivery_order_id')
            ->orderBy('sort_order');
    }

    /**
     * Creator
     */
    public function creator()
    {
        return $this->belongsTo(User::class, 'created_by');
    }

    /**
     * Updater
     */
    public function updater()
    {
        return $this->belongsTo(User::class, 'updated_by');
    }

    /**
     * Quality Checker
     */
    public function qualityChecker()
    {
        return $this->belongsTo(User::class, 'quality_check_by');
    }

    /**
     * Approver
     */
    public function approver()
    {
        return $this->belongsTo(User::class, 'approved_by');
    }

    // ========================================
    // ACCESSORS & MUTATORS
    // ========================================

    /**
     * Status badge for UI
     */
    public function getStatusBadgeAttribute()
    {
        $badges = [
            'DRAFT' => '<span class="badge bg-secondary">Draft</span>',
            'QUALITY_CHECK' => '<span class="badge bg-warning">Quality Check</span>',
            'COMPLETED' => '<span class="badge bg-success">Completed</span>',
            'CANCELLED' => '<span class="badge bg-danger">Cancelled</span>',
        ];
        
        return $badges[$this->status] ?? '<span class="badge bg-secondary">Unknown</span>';
    }

    /**
     * Quality status badge
     */
    public function getQualityStatusBadgeAttribute()
    {
        if (!$this->quality_check_done) {
            return '<span class="badge bg-secondary">Pending</span>';
        }
        
        $badges = [
            'PASSED' => '<span class="badge bg-success">Passed</span>',
            'FAILED' => '<span class="badge bg-danger">Failed</span>',
            'PARTIAL' => '<span class="badge bg-warning">Partial</span>',
        ];
        
        return $badges[$this->quality_check_status] ?? '<span class="badge bg-secondary">N/A</span>';
    }

    // ========================================
    // SCOPES
    // ========================================

    /**
     * Scope for filtering by status
     */
    public function scopeStatus($query, $status)
    {
        return $query->where('status', $status);
    }

    /**
     * Scope for filtering by devotee
     */
    public function scopeForDevotee($query, $devoteeId)
    {
        return $query->where('devotee_id', $devoteeId);
    }

    /**
     * Scope for filtering by sales order
     */
    public function scopeForSalesOrder($query, $salesOrderId)
    {
        return $query->where('sales_order_id', $salesOrderId);
    }

    /**
     * Scope for date range
     */
    public function scopeDateRange($query, $from, $to)
    {
        return $query->whereBetween('do_date', [$from, $to]);
    }

    /**
     * Scope for pending quality check
     */
    public function scopePendingQualityCheck($query)
    {
        return $query->where('quality_check_done', false)
            ->where('status', '!=', 'CANCELLED');
    }

    // ========================================
    // BUSINESS LOGIC METHODS
    // ========================================

    /**
     * Check if DO can be edited
     */
    public function canEdit()
    {
        return in_array($this->status, ['DRAFT', 'QUALITY_CHECK']);
    }

    /**
     * Check if DO can be deleted
     */
    public function canDelete()
    {
        return $this->status === 'DRAFT';
    }

    /**
     * Check if quality check can be performed
     */
    public function canPerformQualityCheck()
    {
        return !$this->quality_check_done && $this->status !== 'CANCELLED';
    }

    /**
     * Calculate totals from items
     */
    public function calculateTotals()
    {
        $items = $this->items;
        
        $subtotal = $items->sum(function($item) {
            return $item->delivered_quantity * $item->unit_price;
        });
        
        $totalTax = $items->sum('tax_amount');
        $totalDiscount = $items->sum('discount_amount');
        
        $this->subtotal = $subtotal;
        $this->total_tax = $totalTax;
        $this->discount_amount = $totalDiscount;
        $this->total_amount = $subtotal + $totalTax - $totalDiscount;
        
        return $this;
    }

    /**
     * Mark as completed
     */
    public function markCompleted($userId = null)
    {
        $this->status = 'COMPLETED';
        $this->approved_by = $userId ?? auth()->id();
        $this->approved_at = now();
        $this->save();
        
        return $this;
    }

    /**
     * Cancel delivery order
     */
    public function cancel($reason = null)
    {
        $this->status = 'CANCELLED';
        $this->notes = ($this->notes ? $this->notes . "\n\n" : '') . 
                       "Cancelled: " . ($reason ?? 'No reason provided');
        $this->save();
        
        // Reverse delivery quantities in SO items
        foreach ($this->items as $doItem) {
            $soItem = $doItem->salesOrderItem;
            if ($soItem) {
                $soItem->delivered_quantity -= $doItem->delivered_quantity;
                $soItem->remaining_quantity = $soItem->quantity - $soItem->delivered_quantity;
                $soItem->delivery_status = $soItem->remaining_quantity > 0 ? 'PARTIAL' : 'PENDING';
                $soItem->save();
            }
        }
        
        return $this;
    }
}