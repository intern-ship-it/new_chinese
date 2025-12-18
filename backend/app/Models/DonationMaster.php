<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;

class DonationMaster extends Model
{
    protected $table = 'donation_masters';

    protected $fillable = [
        'name',
        'secondary_name',
        'type',
        'ledger_id',
        'details',
        'status',
        'created_by',
        'updated_by',
        'deleted_at',
        'deleted_by'
    ];

    protected $casts = [
        'status' => 'integer',
        'ledger_id' => 'integer',
        'created_at' => 'datetime',
        'updated_at' => 'datetime',
        'deleted_at' => 'datetime',
    ];
public $incrementing = false;
protected $keyType = 'string';
    /**
     * Relationship: Donation Master created by User
     */
    public function creator()
    {
        return $this->belongsTo(User::class, 'created_by');
    }

    /**
     * Relationship: Donation Master updated by User
     */
    public function updater()
    {
        return $this->belongsTo(User::class, 'updated_by');
    }

    /**
     * Relationship: Donation Master deleted by User
     */
    public function deleter()
    {
        return $this->belongsTo(User::class, 'deleted_by');
    }

    /**
     * Scope: Get only active donation masters
     */
    public function scopeActive($query)
    {
        return $query->where('status', 1)->whereNull('deleted_at');
    }

    /**
     * Scope: Get by type
     */
    public function scopeOfType($query, $type)
    {
        return $query->where('type', $type);
    }

    /**
     * Get full name (combines primary and secondary if available)
     */
    public function getFullNameAttribute()
    {
        if ($this->secondary_name) {
            return "{$this->name} ({$this->secondary_name})";
        }
        return $this->name;
    }
    public function ledger()
    {
        return $this->belongsTo(\App\Models\Ledger::class, 'ledger_id', 'id');
    }
}