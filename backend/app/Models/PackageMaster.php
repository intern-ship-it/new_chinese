// backend/app/Models/PackageMaster.php
<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\SoftDeletes;

class PackageMaster extends Model
{
    use HasFactory, SoftDeletes;

    protected $table = 'package_master';

    protected $fillable = [
        'package_name',
        'package_name_chinese',
        'number_of_people',
        'amount',
        'description',
        'description_chinese',
        'includes',
        'includes_chinese',
        'status',
        'created_by',
        'updated_by'
    ];

    protected $casts = [
        'id' => 'integer',
        'number_of_people' => 'integer',
        'amount' => 'decimal:2',
        'status' => 'integer',
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
        return $query->where('status', 1);
    }

    public function scopeInactive($query)
    {
        return $query->where('status', 0);
    }

    // Accessor for formatted amount
    public function getAmountFormattedAttribute()
    {
        return 'RM ' . number_format($this->amount, 2);
    }

    // Accessor for per person price
    public function getPricePerPersonAttribute()
    {
        if ($this->number_of_people > 0) {
            return 'RM ' . number_format($this->amount / $this->number_of_people, 2);
        }
        return 'RM 0.00';
    }
}