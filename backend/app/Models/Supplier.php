<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\SoftDeletes;
use Illuminate\Support\Facades\Schema;


class Supplier extends Model
{
    use HasFactory;


    // Table name (optional if Laravel naming convention matches)
    protected $table = 'suppliers';

    // Primary key type is UUID
    protected $keyType = 'string';
    public $incrementing = false;

    // Timestamps
    public $timestamps = true;
    const CREATED_AT = 'created_at';
    const UPDATED_AT = 'updated_at';
    protected $dates = ['deleted_at'];

    // Fillable fields
    protected $fillable = [
        'supplier_code',
        'name',
        'company_name',
        'ledger_id',
        'contact_person',
        'mobile_code',
        'mobile_no',
        'alternate_mobile',
        'email',
        'website',
        'address',
        'city',
        'state',
        'country',
        'pincode',
        'gst_no',
        'pan_no',
        'tax_registration_no',
        'supplier_type',
        'payment_terms',
        'credit_limit',
        'current_balance',
        'is_active',
        'is_verified',
        'blacklisted',
        'blacklist_reason',
        'notes',
        'created_by',
        'updated_by',
    ];

    // Casts
    protected $casts = [
        'id' => 'string',
        'ledger_id' => 'integer',
        'payment_terms' => 'integer',
        'credit_limit' => 'decimal:2',
        'current_balance' => 'decimal:2',
        'is_active' => 'integer',
        'is_verified' => 'boolean',
        'blacklisted' => 'boolean',
    ];

    // Relationships
    public function ledger()
    {
        return $this->belongsTo(Ledger::class, 'ledger_id', 'id');
    }

    public function createdByUser()
    {
        return $this->belongsTo(User::class, 'created_by', 'id');
    }

    public function updatedByUser()
    {
        return $this->belongsTo(User::class, 'updated_by', 'id');
    }
        // Scope for active suppliers
    public function scopeActive($query)
    {
        return $query->where('is_active', true);
    }
}
