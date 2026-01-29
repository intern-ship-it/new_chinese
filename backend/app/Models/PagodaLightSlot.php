<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Concerns\HasUuids;

class PagodaLightSlot extends Model
{
    use HasUuids;

    protected $table = 'pagoda_light_slots';
    
    protected $fillable = [
        'block_id',
        'light_number',
        'light_code',
        'floor_number',
        'rag_position',
        'status',
        'current_registration_id',
        'is_blocked',
        'block_reason',
        'blocked_by',
        'blocked_at'
    ];

    protected $casts = [
        'light_number' => 'integer',
        'floor_number' => 'integer',
        'rag_position' => 'integer',
        'is_blocked' => 'boolean',
        'blocked_at' => 'datetime',
        'created_at' => 'datetime',
        'updated_at' => 'datetime'
    ];

    // Relationships
    public function block()
    {
        return $this->belongsTo(PagodaBlock::class, 'block_id');
    }

    public function currentRegistration()
    {
        return $this->belongsTo(PagodaLightRegistration::class, 'current_registration_id');
    }

    public function registrations()
    {
        return $this->hasMany(PagodaLightRegistration::class, 'light_slot_id');
    }

    // Scopes
    public function scopeAvailable($query)
    {
        return $query->where('status', 'available');
    }

    public function scopeRegistered($query)
    {
        return $query->where('status', 'registered');
    }

    public function scopeExpired($query)
    {
        return $query->where('status', 'expired');
    }

    public function scopeByLightNumber($query, $lightNumber)
    {
        return $query->where('light_number', $lightNumber);
    }

    public function scopeByLightCode($query, $lightCode)
    {
        return $query->where('light_code', $lightCode);
    }

    public function scopeNotBlocked($query)
    {
        return $query->where('is_blocked', false);
    }

    // Helper methods
    public function isAvailable()
    {
        return $this->status === 'available' && !$this->is_blocked;
    }

    public function isRegistered()
    {
        return $this->status === 'registered';
    }

    public function isBlocked()
    {
        return $this->is_blocked;
    }

    public function blockLight($reason = null, $userId = null)
    {
        $this->update([
            'is_blocked' => true,
            'block_reason' => $reason,
            'blocked_by' => $userId ?? auth()->id(),
            'blocked_at' => now()
        ]);
    }

    public function unblockLight()
    {
        $this->update([
            'is_blocked' => false,
            'block_reason' => null,
            'blocked_by' => null,
            'blocked_at' => null
        ]);
    }

    public function markAsAvailable()
    {
        $this->update([
            'status' => 'available',
            'current_registration_id' => null
        ]);
    }

    public function markAsRegistered($registrationId)
    {
        $this->update([
            'status' => 'registered',
            'current_registration_id' => $registrationId
        ]);
    }
}