<?php
namespace App\Models;

use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Concerns\HasUuids;

class OrganizationPositionHistory extends Model
{
    use HasUuids;

    protected $table = 'organization_position_history';
    
    public $timestamps = false;

    protected $fillable = [
        'position_id',
        'user_id',
        'action',
        'action_date',
        'action_by',
        'reason',
        'term_start_date',
        'term_end_date'
    ];

    protected $casts = [
        'action_date' => 'datetime',
        'term_start_date' => 'date:Y-m-d',
        'term_end_date' => 'date:Y-m-d'
    ];

    protected static function boot()
    {
        parent::boot();

        static::creating(function ($model) {
            $model->action_date = $model->action_date ?: now();
        });
    }

    public function position()
    {
        return $this->belongsTo(OrganizationPosition::class, 'position_id');
    }

    public function user()
    {
        return $this->belongsTo(User::class);
    }

    public function actionBy()
    {
        return $this->belongsTo(User::class, 'action_by');
    }
}