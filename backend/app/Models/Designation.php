<?php
// app/Models/Designation.php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Concerns\HasUuids;
use Illuminate\Database\Eloquent\Relations\BelongsTo;
use Illuminate\Database\Eloquent\Relations\HasMany;

class Designation extends Model
{
    use HasUuids;

    protected $fillable = [
        'designation_code',
        'designation_name',
        'department',
        'level',
        'role_id',
        'parent_designation_id',
        'additional_permissions',
        'can_approve_leave',
        'can_approve_payments',
        'can_approve_bookings',
        'is_head_of_department',
        'max_leave_approval_days',
        'max_payment_approval_amount',
        'is_active',
        'description'
    ];

    protected $casts = [
        'additional_permissions' => 'array',
        'can_approve_leave' => 'boolean',
        'can_approve_payments' => 'boolean',
        'can_approve_bookings' => 'boolean',
        'is_head_of_department' => 'boolean',
        'is_active' => 'boolean',
        'max_payment_approval_amount' => 'decimal:2'
    ];

    public function role(): BelongsTo
    {
        return $this->belongsTo(Role::class);
    }

    public function parentDesignation(): BelongsTo
    {
        return $this->belongsTo(Designation::class, 'parent_designation_id');
    }

    public function childDesignations(): HasMany
    {
        return $this->hasMany(Designation::class, 'parent_designation_id');
    }

    public function staff(): HasMany
    {
        return $this->hasMany(Staff::class);
    }

    public function getHierarchyPath(): array
    {
        $path = [$this->designation_name];
        $parent = $this->parentDesignation;
        
        while ($parent) {
            array_unshift($path, $parent->designation_name);
            $parent = $parent->parentDesignation;
        }
        
        return $path;
    }

    public function scopeActive($query)
    {
        return $query->where('is_active', true);
    }

    public function scopeDepartment($query, $department)
    {
        return $query->where('department', $department);
    }

    public static function generateDesignationCode($department): string
    {
        $prefix = substr(strtoupper($department), 0, 3);
        $lastDesignation = self::where('designation_code', 'like', $prefix . '%')
            ->orderBy('designation_code', 'desc')
            ->first();

        if ($lastDesignation) {
            $lastNumber = intval(substr($lastDesignation->designation_code, -3));
            $newNumber = str_pad($lastNumber + 1, 3, '0', STR_PAD_LEFT);
        } else {
            $newNumber = '001';
        }

        return $prefix . '-' . $newNumber;
    }
}