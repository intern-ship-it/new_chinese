<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\SoftDeletes;
use Illuminate\Support\Str;

class Devotee extends Model
{
    use HasFactory, SoftDeletes;

    // Table name
    protected $table = 'devotees';

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
        'devotee_code',
        'customer_name',
        'customer_type',
        'mobile_code',
        'mobile',
        'email',
        'address',
        'city',
        'state',
        'country',
        'pincode',
        'tin_no',
        'is_active',
        'is_verified',
        'notes',
        'created_by',
        'updated_by',
    ];

    // Casts
    protected $casts = [
        'id' => 'string',
        'is_active' => 'boolean',
        'is_verified' => 'boolean',
    ];

    // Boot method to auto-generate UUID
    protected static function boot()
    {
        parent::boot();

        static::creating(function ($model) {
            if (empty($model->id)) {
                $model->id = (string) Str::uuid();
            }
        });
    }

    // Relationships
    public function createdByUser()
    {
        return $this->belongsTo(User::class, 'created_by', 'id');
    }

    public function updatedByUser()
    {
        return $this->belongsTo(User::class, 'updated_by', 'id');
    }

    // Scopes
    public function scopeActive($query)
    {
        return $query->where('is_active', true);
    }

    public function scopeVerified($query)
    {
        return $query->where('is_verified', true);
    }

    public function scopeByCustomerType($query, $type)
    {
        return $query->where('customer_type', 'LIKE', "%{$type}%");
    }

    // Accessor for full phone number
    public function getFullPhoneAttribute()
    {
        return $this->mobile_code . $this->mobile;
    }
}
