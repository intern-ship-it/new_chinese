<?php
namespace App\Models;

use Spatie\Permission\Models\Permission as SpatiePermission;
use Illuminate\Database\Eloquent\Concerns\HasUuids;

class Permission extends SpatiePermission
{
    use HasUuids;

    protected $fillable = [
        'name',
        'guard_name',
        'display_name',
        'module',
        'description'
    ];
}