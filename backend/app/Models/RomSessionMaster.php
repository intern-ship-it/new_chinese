<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Concerns\HasUuids;
use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\SoftDeletes;

class RomSessionMaster extends Model
{
    use HasFactory, HasUuids, SoftDeletes;

    protected $table = 'rom_session_masters';

    protected $fillable = [
        'name_primary',
        'name_secondary',
        'description',
        'from_time',
        'to_time',
        'venue_ids',
        'amount',
        'max_members',
        'status',
        'created_by',
        'updated_by',
        'deleted_by',
    ];

    protected $casts = [
        'venue_ids' => 'array',
        'amount' => 'decimal:2',
        'max_members' => 'integer',
        'status' => 'integer',
    ];

    protected $dates = ['deleted_at'];

    // ========================================
    // RELATIONSHIPS
    // ========================================

    public function creator()
    {
        return $this->belongsTo(User::class, 'created_by');
    }

    public function updater()
    {
        return $this->belongsTo(User::class, 'updated_by');
    }

    public function deleter()
    {
        return $this->belongsTo(User::class, 'deleted_by');
    }

    // Get venues (many-to-many relationship through JSON)
    public function venues()
    {
        if (empty($this->venue_ids)) {
            return collect();
        }
        return RomVenueMaster::whereIn('id', $this->venue_ids)->get();
    }

    // ========================================
    // SCOPES
    // ========================================

    public function scopeActive($query)
    {
        return $query->where('status', 1);
    }

    public function scopeInactive($query)
    {
        return $query->where('status', 0);
    }

    public function scopeSearchByName($query, $search)
    {
        return $query->where(function($q) use ($search) {
            $q->where('name_primary', 'LIKE', "%{$search}%")
              ->orWhere('name_secondary', 'LIKE', "%{$search}%");
        });
    }

    public function scopeByVenue($query, $venueId)
    {
        return $query->whereJsonContains('venue_ids', $venueId);
    }

    // ========================================
    // ACCESSORS
    // ========================================

    public function getFormattedNameAttribute()
    {
        if ($this->name_secondary) {
            return "{$this->name_primary} / {$this->name_secondary}";
        }
        return $this->name_primary;
    }

    public function getFormattedTimeAttribute()
    {
        return date('h:i A', strtotime($this->from_time)) . ' - ' . date('h:i A', strtotime($this->to_time));
    }

    public function getStatusLabelAttribute()
    {
        return $this->status === 1 ? 'Active' : 'Inactive';
    }

    public function getStatusBadgeClassAttribute()
    {
        return $this->status === 1 ? 'bg-success' : 'bg-danger';
    }

    public function getFormattedAmountAttribute()
    {
        return number_format($this->amount, 2);
    }

    public function getVenueNamesAttribute()
    {
        return $this->venues()->pluck('formatted_name')->join(', ');
    }
}