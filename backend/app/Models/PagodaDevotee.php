<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Concerns\HasUuids;

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
        'notes'
    ];

    protected $casts = [
        'created_at' => 'datetime',
        'updated_at' => 'datetime'
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

    // Scopes
    public function scopeSearch($query, $search)
    {
        return $query->where(function($q) use ($search) {
            $q->where('name_english', 'ILIKE', "%{$search}%")
              ->orWhere('name_chinese', 'ILIKE', "%{$search}%")
              ->orWhere('nric', 'ILIKE', "%{$search}%")
              ->orWhere('contact_no', 'ILIKE', "%{$search}%")
              ->orWhere('email', 'ILIKE', "%{$search}%");
        });
    }
}