<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Concerns\HasUuids;

/**
 * ================================================================
 * PagodaFamilyMember Model
 * Location: app/Models/PagodaFamilyMember.php
 * ================================================================
 * 
 * This model represents the relationship between head of family
 * and their family members in the pagoda system.
 * 
 * Table: pagoda_family_members
 * Columns:
 *   - id (uuid, primary key)
 *   - head_of_family_id (uuid, foreign key to pagoda_devotees.id)
 *   - member_devotee_id (uuid, foreign key to pagoda_devotees.id)
 *   - relationship (varchar, e.g., 'spouse', 'son', 'daughter')
 *   - created_at
 *   - updated_at
 */

class PagodaFamilyMember extends Model
{
    use HasUuids;

    protected $table = 'pagoda_family_members';

    protected $fillable = [
        'head_of_family_id',
        'member_devotee_id',
        'relationship',
    ];

    /**
     * Get the head of family (the main devotee)
     */
    public function headOfFamily()
    {
        return $this->belongsTo(PagodaDevotee::class, 'head_of_family_id');
    }

    /**
     * Get the family member devotee
     */
    public function memberDevotee()
    {
        return $this->belongsTo(PagodaDevotee::class, 'member_devotee_id');
    }
}