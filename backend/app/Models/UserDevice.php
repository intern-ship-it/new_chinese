<?php
namespace App\Models;

use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Concerns\HasUuids;

class UserDevice extends Model
{
    use HasUuids;

    protected $fillable = [
        'user_id',
        'device_id',
        'device_info',
        'ip_address',
        'last_used_at',
        'is_active'
    ];

    protected $casts = [
        'device_info' => 'array',
        'last_used_at' => 'datetime',
        'is_active' => 'boolean'
    ];

    public function user()
    {
        return $this->belongsTo(User::class);
    }

    public function refreshTokens()
    {
        return $this->hasMany(RefreshToken::class, 'device_id');
    }
}