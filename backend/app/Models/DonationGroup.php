<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;

class DonationGroup extends Model
{
    protected $table = 'donation_groups';
    
    protected $fillable = [
        'name',
        'secondary_name',
        'status',
        'created_by',
        'updated_by',
        'deleted_by'
    ];

    protected $casts = [
        'status' => 'boolean',
        'deleted_at' => 'datetime'
    ];

    public function donations()
    {
        return $this->hasMany(DonationMaster::class, 'group_id');
    }
}