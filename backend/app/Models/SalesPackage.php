<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\SoftDeletes;
use Illuminate\Support\Facades\DB;

class SalesPackage extends Model
{
    use HasFactory, SoftDeletes;

    protected $table = 'sales_packages';

    protected $fillable = [
        'package_number',
        'package_name',
        'package_date',
        'items',
        'subtotal',
        'tax_rate',
        'shipping_charges',
        'other_charges',
        'discount',
        'total_amount',
        'grand_total',
        'description',
        'status',
        'is_active',
        'created_by',
        'updated_by'
    ];

    protected $casts = [
        'package_date' => 'date',
        'items' => 'array',
        'subtotal' => 'decimal:2',
        'shipping_charges' => 'decimal:2',
        'other_charges' => 'decimal:2',
        'discount' => 'decimal:2',
        'total_amount' => 'decimal:2',
        'grand_total' => 'decimal:2',
        'is_active' => 'boolean',
        'created_at' => 'datetime',
        'updated_at' => 'datetime',
        'deleted_at' => 'datetime'
    ];

    // Relationships
    public function createdBy()
    {
        return $this->belongsTo(User::class, 'created_by');
    }

    public function updatedBy()
    {
        return $this->belongsTo(User::class, 'updated_by');
    }

    // Scopes
    public function scopeActive($query)
    {
        return $query->where('is_active', true);
    }

    public function scopeInactive($query)
    {
        return $query->where('is_active', false);
    }

    /**
     * Generate package number in format: PA + DDMMYYYY + running number
     * Example: PA017202600001, PA017202600002, etc.
     */
    public static function generatePackageNumber($date = null)
    {
        $date = $date ?? now();
        
        // Format: PA + DDMMYYYY
        $prefix = 'PA' . $date->format('dmY');
        
        // Get the last package number for today
        $lastPackage = self::where('package_number', 'LIKE', $prefix . '%')
            ->orderBy('package_number', 'desc')
            ->first();
        
        if ($lastPackage) {
            // Extract the running number (last 4 digits) and increment
            $lastNumber = (int) substr($lastPackage->package_number, -4);
            $newNumber = str_pad($lastNumber + 1, 4, '0', STR_PAD_LEFT);
        } else {
            // First package of the day
            $newNumber = '0001';
        }
        
        return $prefix . $newNumber;
    }

    /**
     * Boot method to auto-generate package number
     */
    protected static function boot()
    {
        parent::boot();

        static::creating(function ($package) {
            if (empty($package->package_number)) {
                $package->package_number = self::generatePackageNumber($package->package_date);
            }
        });
    }

    /**
     * Calculate totals based on items
     */
    public function calculateTotals()
    {
        $itemSum = 0;

        if (is_array($this->items)) {
            foreach ($this->items as $item) {
                $itemSum += $item['amount'] ?? 0;
            }
        }

        // Store item sum as subtotal for reference
        $this->subtotal = $itemSum;
        
        // We do NOT overwrite $this->total_amount here, because it serves as the 
        // User-Defined Bundle Price (Base Price) passed from the Controller/Request.
        // If it was null, Controller defaults to 0.

        // Calculate Subtotal After Discount
        $subtotalAfter = $this->total_amount - $this->discount;

        // Calculate Tax on Subtotal After Discount
        $taxRate = ($this->tax_rate ?? 0) / 100;
        $taxAmount = $subtotalAfter * $taxRate;

        // Calculate Grand Total = Subtotal After + Tax
        $this->grand_total = $subtotalAfter + $taxAmount;
    }
}