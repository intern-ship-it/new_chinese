<?php
namespace App\Models;

use Spatie\Permission\Models\Role as SpatieRole;
use Illuminate\Database\Eloquent\Concerns\HasUuids;

class Role extends SpatieRole
{
    use HasUuids;

    protected $fillable = [
        'name',
        'guard_name',
        'display_name',
        'description',
        'is_system'
    ];

    protected $casts = [
        'is_system' => 'boolean'
    ];
}