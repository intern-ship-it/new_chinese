<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Factories\HasFactory;

class SaleItemCommission extends Model
{
    use HasFactory;

    protected $table = 'sale_item_commissions';

    public $timestamps = true;

    protected $fillable = [
        'sale_item_id',
        'staff_id',
        'commission_percent',
    ];

    protected $casts = [
        'commission_percent' => 'decimal:2',
    ];

    /**
     * Relationship: Parent sale item
     */
    public function saleItem()
    {
        return $this->belongsTo(SaleItem::class, 'sale_item_id');
    }

    /**
     * Relationship: Staff member
     */
    public function staff()
    {
        return $this->belongsTo(Staff::class, 'staff_id');
    }

    /**
     * Calculate commission amount based on sale price
     */
    public function calculateCommissionAmount($salePrice)
    {
        return ($salePrice * $this->commission_percent) / 100;
    }

    /**
     * Get formatted commission percentage
     */
    public function getFormattedPercentAttribute()
    {
        return number_format($this->commission_percent, 2) . '%';
    }
}