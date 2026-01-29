<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Concerns\HasUuids;

class RefreshToken extends Model
{
    use HasUuids;

    // protected $fillable = [
    //     'user_id',
    //     'device_id',
    //     'token_id',
    //     'expires_at',
    //     'revoked_at'
    // ];

    // protected $casts = [
    //     'expires_at' => 'datetime',
    //     'revoked_at' => 'datetime'
    // ];
    protected $fillable = ['user_id', 'device_id', 'token_id', 'metadata', 'expires_at', 'last_used_at', 'revoked_at'];
    protected $casts = ['metadata' => 'array', 'last_used_at' => 'datetime', 'expires_at' => 'datetime', 'revoked_at' => 'datetime'];

    public function user()
    {
        return $this->belongsTo(User::class);
    }

    public function device()
    {
        return $this->belongsTo(UserDevice::class, 'device_id');
    }

    public function isValid()
    {
        return !$this->revoked_at && $this->expires_at->isFuture();
    }

    public function revoke()
    {
        $this->update(['revoked_at' => now()]);
    }
}
