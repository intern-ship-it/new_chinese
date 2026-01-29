<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Concerns\HasUuids;
use App\Models\PagodaFamilyMember;

class PagodaDevotee extends Model
{
    use HasUuids;

    protected $table = 'pagoda_devotees';

    protected $fillable = [
        'user_id',
        'name_english',
        'name_chinese',
        'nric',
        'contact_no',
        'email',
        'address',
        'notes',
        'date_of_birth',          // ← ADDED
        'gender',                  // ← ADDED
        'is_head_of_family',       // ← ADDED
        'head_of_family_id',       // ← ADDED
    ];

    protected $casts = [
        'created_at' => 'datetime',
        'updated_at' => 'datetime',
        'is_head_of_family' => 'boolean',   // ← ADDED
        'date_of_birth' => 'date',          // ← ADDED
    ];

    // Relationships
    public function user()
    {
        return $this->belongsTo(User::class, 'user_id');
    }

    public function registrations()
    {
        return $this->hasMany(PagodaLightRegistration::class, 'devotee_id');
    }

    public function activeRegistrations()
    {
        return $this->hasMany(PagodaLightRegistration::class, 'devotee_id')
            ->where('status', 'active');
    }

    /**
     * Get family members via pagoda_family_members junction table
     * (when this devotee is head of family)
     */
    public function familyMembers()
    {
        return $this->hasMany(PagodaFamilyMember::class, 'head_of_family_id');
    }

    /**
     * Get the head of family (when this devotee is a family member)
     */
    public function headOfFamily()
    {
        return $this->belongsTo(PagodaDevotee::class, 'head_of_family_id');
    }

    /**
     * Get all dependents directly linked via head_of_family_id column
     */
    public function dependents()
    {
        return $this->hasMany(PagodaDevotee::class, 'head_of_family_id');
    }

    /**
     * Get family members count
     */
    public function getFamilyMembersCountAttribute()
    {
        if ($this->is_head_of_family) {
            return $this->familyMembers()->count();
        }
        return 0;
    }

    /**
     * Check if this devotee has family members
     */
    public function hasFamilyMembers()
    {
        return $this->is_head_of_family && $this->familyMembers()->count() > 0;
    }

    // Scopes
    public function scopeSearch($query, $search)
    {
        return $query->where(function ($q) use ($search) {
            $q->where('name_english', 'ILIKE', "%{$search}%")
                ->orWhere('name_chinese', 'ILIKE', "%{$search}%")
                ->orWhere('nric', 'ILIKE', "%{$search}%")
                ->orWhere('contact_no', 'ILIKE', "%{$search}%")
                ->orWhere('email', 'ILIKE', "%{$search}%");
        });
    }

    /**
     * Scope to get only heads of family
     */
    public function scopeHeadsOfFamily($query)
    {
        return $query->where('is_head_of_family', true);
    }

    /**
     * Scope to get only family members (not heads)
     */
    public function scopeFamilyMembersOnly($query)
    {
        return $query->whereNotNull('head_of_family_id');
    }
}