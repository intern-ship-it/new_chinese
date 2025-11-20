<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Concerns\HasUuids;

class PagodaLightRenewal extends Model
{
    use HasUuids;

    protected $table = 'pagoda_light_renewals';
    
    protected $fillable = [
        'original_registration_id',
        'new_registration_id',
        'renewed_by_staff_id',
        'renewal_date',
        'auto_renewed',
        'notes'
    ];

    protected $casts = [
        'renewal_date' => 'date',
        'auto_renewed' => 'boolean',
        'created_at' => 'datetime'
    ];

    public $timestamps = false; // Only has created_at

    protected static function boot()
    {
        parent::boot();
        
        static::creating(function ($model) {
            $model->created_at = now();
        });
    }

    // Relationships
    public function originalRegistration()
    {
        return $this->belongsTo(PagodaLightRegistration::class, 'original_registration_id');
    }

    public function newRegistration()
    {
        return $this->belongsTo(PagodaLightRegistration::class, 'new_registration_id');
    }

    public function staff()
    {
        return $this->belongsTo(User::class, 'renewed_by_staff_id');
    }
}