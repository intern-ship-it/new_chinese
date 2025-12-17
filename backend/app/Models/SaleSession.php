<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\SoftDeletes;

class SaleSession extends Model
{
    use HasFactory, SoftDeletes;

    protected $table = 'sale_sessions';

    protected $fillable = [
        'name',
        'from_time',
        'to_time',
        'status',
        'created_by',
        'updated_by',
    ];

    protected $casts = [
        'status' => 'boolean',
        'from_time' => 'datetime:H:i',
        'to_time' => 'datetime:H:i',
    ];

    protected $dates = ['deleted_at'];

    /**
     * Relationship: Sale items available in this session
     */
    public function saleItems()
    {
        return $this->belongsToMany(SaleItem::class, 'sale_item_sessions', 'sale_session_id', 'sale_item_id')
            ->withTimestamps();
    }

    /**
     * Scope: Only active sessions
     */
    public function scopeActive($query)
    {
        return $query->where('status', true);
    }

    /**
     * Scope: Order by from_time
     */
    public function scopeOrdered($query)
    {
        return $query->orderBy('from_time', 'asc');
    }

    /**
     * User who created this record
     */
    public function createdBy()
    {
        return $this->belongsTo(User::class, 'created_by');
    }

    /**
     * User who last updated this record
     */
    public function updatedBy()
    {
        return $this->belongsTo(User::class, 'updated_by');
    }

    /**
     * Get formatted time range
     */
    public function getTimeRangeAttribute()
    {
        return $this->from_time->format('h:i A') . ' - ' . $this->to_time->format('h:i A');
    }
}