<?php
// OrganizationPosition.php
namespace App\Models;

use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Concerns\HasUuids;

class OrganizationPosition extends Model
{
    use HasUuids;

    protected $fillable = [
        'name',
        'display_name',
        'description',
        'hierarchy_level',
        'is_default',
        'is_deletable',
        'max_holders',
        'role_id',
        'permissions',
        'is_active',
        'created_by',
        'updated_by'
    ];

    protected $casts = [
        'is_default' => 'boolean',
        'is_deletable' => 'boolean',
        'is_active' => 'boolean',
        'permissions' => 'json',
        'hierarchy_level' => 'integer',
        'max_holders' => 'integer'
    ];

    public function role()
    {
        return $this->belongsTo(Role::class);
    }

    public function holders()
    {
        return $this->hasMany(OrganizationPositionHolder::class, 'position_id');
    }

    public function currentHolders()
    {
        return $this->hasMany(OrganizationPositionHolder::class, 'position_id')
            ->where('is_current', true);
    }

    public function history()
    {
        return $this->hasMany(OrganizationPositionHistory::class, 'position_id');
    }

    public function createdBy()
    {
        return $this->belongsTo(User::class, 'created_by');
    }

    public function updatedBy()
    {
        return $this->belongsTo(User::class, 'updated_by');
    }
}