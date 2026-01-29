<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;

class OccasionServiceMaster extends Model
{
    protected $table = 'occasion_services_master';

    protected $fillable = [
        'name',
        'name_secondary',
        'description',
        'service_type_id',
        'is_addon',
        'amount',
        'ledger_id',
        'status',
        'sort_order'
    ];

    protected $casts = [
        'is_addon' => 'boolean',
        'amount' => 'decimal:2',
        'sort_order' => 'integer'
    ];

    // Relationships
    public function serviceType()
    {
        return $this->belongsTo(ServiceType::class, 'service_type_id');
    }

    public function ledger()
    {
        return $this->belongsTo(Ledger::class, 'ledger_id');
    }

    // Scopes
    public function scopeActive($query)
    {
        return $query->where('status', 'active');
    }

    public function scopeAddons($query)
    {
        return $query->where('is_addon', true);
    }
}