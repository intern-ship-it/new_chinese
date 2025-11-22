// backend/app/Models/SessionMaster.php
<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\SoftDeletes;

class SessionMaster extends Model
{
    use HasFactory, SoftDeletes;

    protected $table = 'session_master';

    protected $fillable = [
        'session_name',
        'session_name_chinese',
        'duration_hours',
        'amount',
        'description',
        'description_chinese',
        'start_time',
        'end_time',
        'status',
        'created_by',
        'updated_by'
    ];

    protected $casts = [
        'id' => 'integer',
        'duration_hours' => 'decimal:2',
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

    // Accessor for formatted duration
    public function getDurationFormattedAttribute()
    {
        $hours = floor($this->duration_hours);
        $minutes = ($this->duration_hours - $hours) * 60;
        
        if ($minutes > 0) {
            return "{$hours}h {$minutes}m";
        }
        return "{$hours}h";
    }

    // Accessor for formatted amount
    public function getAmountFormattedAttribute()
    {
        return 'RM ' . number_format($this->amount, 2);
    }
}