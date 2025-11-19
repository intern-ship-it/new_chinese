<?php
namespace App\Models;

use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Concerns\HasUuids;

class UserLoginHistory extends Model
{
    use HasUuids;

    protected $table = 'user_login_history';

    protected $fillable = [
        'user_id',
        'login_at',
        'login_ip',
        'user_agent',
        'device_info',
        'login_channel',
        'logout_at',
        'session_duration',
        'status',
        'failure_reason'
    ];

    protected $casts = [
        'device_info' => 'array',
        'login_at' => 'datetime',
        'logout_at' => 'datetime'
    ];

    public $timestamps = false;

    protected static function boot()
    {
        parent::boot();

        static::creating(function ($model) {
            $model->login_at = $model->login_at ?: now();
        });
    }

    public function user()
    {
        return $this->belongsTo(User::class);
    }
}