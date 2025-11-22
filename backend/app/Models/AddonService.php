// backend/app/Models/AddonService.php
<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\SoftDeletes;

class AddonService extends Model
{
    use HasFactory, SoftDeletes;

    protected $table = 'addon_services';

    protected $fillable = [
        'addon_group_id',
        'service_name',
        'service_name_chinese',
        'internal_amount',
        'external_amount',
        'description',
        'description_chinese',
        'unit',
        'status',
        'created_by',
        'updated_by'
    ];

    protected $casts = [
        'id' => 'integer',
        'addon_group_id' => 'integer',
        'internal_amount' => 'decimal:2',
        'external_amount' => 'decimal:2',
        'status' => 'integer',
        'created_at' => 'datetime',
        'updated_at' => 'datetime',
        'deleted_at' => 'datetime'
    ];

    // Relationships
    public function group()
    {
        return $this->belongsTo(AddonGroup::class, 'addon_group_id');
    }

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
        return $query->where('status', 1);
    }

    // Accessors
    public function getInternalAmountFormattedAttribute()
    {
        return 'RM ' . number_format($this->internal_amount, 2);
    }

    public function getExternalAmountFormattedAttribute()
    {
        return 'RM ' . number_format($this->external_amount, 2);
    }

    public function getPriceDifferenceAttribute()
    {
        return $this->external_amount - $this->internal_amount;
    }

    public function getPriceDifferenceFormattedAttribute()
    {
        $diff = $this->price_difference;
        return ($diff >= 0 ? '+' : '') . 'RM ' . number_format($diff, 2);
    }
}